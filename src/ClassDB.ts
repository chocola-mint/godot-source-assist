import * as vscode from 'vscode';
import { parser } from '@lezer/cpp';
import * as lezer from '@lezer/common';
import * as ParserUtils from './ParserUtils';
import * as VariantUtils from './VariantUtils';

class FunctionBindInfo {
	location! : vscode.Range;
	name! : string;
	codeLensCommand! : vscode.Command;
	linkedProperty? : string;
}

class PropertyBindInfo {
	location! : vscode.Range;
	name! : string;
	codeLensCommand! : vscode.Command;
	getter! : string;
	setter! : string;
}

class ClassBindInfo {
	functionBindings! : Map<string, FunctionBindInfo>;
	propertyBindings! : Map<string, PropertyBindInfo>;
}

class ParserCacheData {
	tree! : lezer.Tree;
	fragment! : readonly lezer.TreeFragment[];
}

class HeaderCacheData extends ParserCacheData {
}

class SourceCacheData extends ParserCacheData {
	classBindInfo! : ClassBindInfo;
}

const headerCache = new Map<vscode.Uri, HeaderCacheData>();
const sourceCache = new Map<vscode.Uri, SourceCacheData>();

export async function getHeaderCacheData(headerUri : vscode.Uri) : Promise<HeaderCacheData> {
    let headerCacheData = headerCache.get(headerUri);
    if (!headerCacheData) {
        try {
            const document = await vscode.workspace.openTextDocument(headerUri);
            headerCacheData = rebuildHeaderCache(document);
        } catch (e) {
            return Promise.reject(e);
        }
    } else {
        console.log("Reuse header cache: " + headerUri.fsPath);
    }
    return headerCacheData;
}

export async function getSourceCacheData(sourceUri : vscode.Uri) : Promise<SourceCacheData> {
    let sourceCacheData = sourceCache.get(sourceUri);
    if (!sourceCacheData) {
        try {
            const source = await vscode.workspace.openTextDocument(sourceUri);
            sourceCacheData = rebuildSourceCache(source);
        } catch (e) {
            return Promise.reject(e);
        }
    } else {
        console.log("Reuse source cache: " + sourceUri.fsPath);
    }
    return sourceCacheData;
}

function rebuildClassBindInfo(document : vscode.TextDocument, tree : lezer.Tree) : ClassBindInfo {
	console.log("Rebuild class bind info: " + document.fileName);
	const text = document.getText();
	const functionBindings = new Map<string, FunctionBindInfo>();
	const propertyBindings = new Map<string, PropertyBindInfo>();
    
    let functionDefinitions = ParserUtils.getNodesOfNameInTree(tree, "FunctionDefinition", 5);

	for (const functionDefinition of functionDefinitions) {
		const functionIdentifier = functionDefinition.getChild("FunctionDeclarator")
        ?.getChild("ScopedIdentifier")
        ?? functionDefinition.getChild("PointerDeclarator")
        ?.getChild("FunctionDeclarator")
        ?.getChild("ScopedIdentifier");
		if (functionIdentifier) {
			const functionClassIdentifier = functionIdentifier.getChild("NamespaceIdentifier");
			const functionNameIdentifier = functionIdentifier.getChild("Identifier");
			if (functionClassIdentifier && functionNameIdentifier && text.substring(functionNameIdentifier.from, functionNameIdentifier.to) === "_bind_methods") {
				const className = text.substring(functionClassIdentifier.from, functionClassIdentifier.to);
				const expressions = functionDefinition.getChild("CompoundStatement")?.getChildren("ExpressionStatement");
				if (expressions) {
					for (const expression of expressions) {
						const callExpression = expression.getChild("CallExpression");
						if (callExpression) {
							const callIdentifier = callExpression.getChild("ScopedIdentifier") ?? callExpression.getChild("Identifier");
							const argumentList = callExpression.getChild("ArgumentList");
							if (callIdentifier && argumentList) {
								const callName = text.substring(callIdentifier.from, callIdentifier.to);
								switch (callName) {
									case "ClassDB::bind_method": {
										const pointerIdentifier = argumentList.getChild("PointerExpression")?.getChild("ScopedIdentifier");
										if (pointerIdentifier) {
											const dmethodExpression = argumentList.getChild("CallExpression");
											if (dmethodExpression) {
												const dmethodIdentifier = dmethodExpression.getChild("Identifier");
												if (dmethodIdentifier && text.substring(dmethodIdentifier.from, dmethodIdentifier.to) === "D_METHOD") {
													const dmethodArguments = dmethodExpression.getChild("ArgumentList")?.getChildren("String");
													if (dmethodArguments) {
														const bindNameIdentifier = dmethodArguments.shift();
														if (bindNameIdentifier) {
															const bindName = text.substring(bindNameIdentifier.from + 1, bindNameIdentifier.to - 1);
															const argumentNames = dmethodArguments.map(arg => text.substring(arg.from + 1, arg.to - 1));
															const range = new vscode.Range(
																document.positionAt(callExpression.from),
																document.positionAt(callExpression.to)
															);
															functionBindings.set(
																// NamespaceIdentifier, :: , Identifier
																text.substring(pointerIdentifier.from, pointerIdentifier.to),
																{
																	location: range,
																	name: bindName,
																	codeLensCommand: {
																		title: `func ${bindName}(${argumentNames.join()})`,
																		command: "editor.action.goToLocations",
																		arguments: [ document.uri, range.start, [ range.start ], "goto", "" ]
																	}
																}
															);
														}
													}
												}
											} else {
												// Function name only.
												const bindNameIdentifier = argumentList.getChild("String");
												if (bindNameIdentifier) {
													const bindName = text.substring(bindNameIdentifier.from + 1, bindNameIdentifier.to - 1);
													const range = new vscode.Range(
														document.positionAt(callExpression.from),
														document.positionAt(callExpression.to)
													);
													functionBindings.set(
														// NamespaceIdentifier, :: , Identifier
														text.substring(pointerIdentifier.from, pointerIdentifier.to),
														{
															location: range,
															name: bindName,
															codeLensCommand: {
																title: `func ${bindName}()`,
																command: "editor.action.goToLocations",
																arguments: [ document.uri, range.start, [ range.start ], "goto", "" ]
															}
														}
													);
												}
											}
										}
									} break;
									case "ADD_PROPERTY": {
										const propertyInfo = argumentList.getChild("CallExpression");
										if (propertyInfo) {
											const propertyInfoIdentifier = propertyInfo.getChild("Identifier");
											const propertyInfoArgumentList = propertyInfo.getChild("ArgumentList");
											if (propertyInfoIdentifier && propertyInfoArgumentList && text.substring(propertyInfoIdentifier.from, propertyInfoIdentifier.to) === "PropertyInfo") {
												const propertyInfoTypeIdentifier = propertyInfoArgumentList.getChild("ScopedIdentifier")?.getChild("Identifier");
												const propertyInfoNameIdentifier = propertyInfoArgumentList.getChild("String");
												if (propertyInfoTypeIdentifier && propertyInfoNameIdentifier) {
													const propertyName = text.substring(propertyInfoNameIdentifier.from + 1, propertyInfoNameIdentifier.to - 1);
													const propertyVariantTypeName = text.substring(propertyInfoTypeIdentifier.from, propertyInfoTypeIdentifier.to);
													const [ getter, setter ] = argumentList.getChildren("String")
													.map(stringIdentifier => text.substring(stringIdentifier.from + 1, stringIdentifier.to - 1));
													const range = new vscode.Range(
														document.positionAt(callExpression.from),
														document.positionAt(callExpression.to)
													);
													propertyBindings.set(propertyName, {
														location: range,
														name: propertyName,
														codeLensCommand: {
															title: `var ${propertyName} : ${VariantUtils.convertEnumNameToBindName(propertyVariantTypeName)}`,
															command: "editor.action.goToLocations",
															arguments: [ document.uri, range.start, [ range.start ], "goto", "" ]
														},
														getter: `${className}::${getter}`,
														setter: `${className}::${setter}`,
													});
												}
											}
										}
									} break;
									case "ADD_SIGNAL": {

									} break;
									case "BIND_ENUM_CONSTANT": {

									} break;
								}
							}
						}
					}
				}
			}
		}
	}

	for (const propertyBinding of propertyBindings.values()) {
		const getter = functionBindings.get(propertyBinding.getter);
		if (getter) {
			getter.linkedProperty = propertyBinding.name;
		}
		const setter = functionBindings.get(propertyBinding.setter);
		if (setter) {
			setter.linkedProperty = propertyBinding.name;
		}
	}

	return {
		functionBindings: functionBindings,
		propertyBindings: propertyBindings,
	};
}

function rebuildSourceCache(document : vscode.TextDocument) {
	console.log("Rebuild source cache: " + document.fileName);
    
	const text = document.getText();
	let tree = parser.parse(text);
	let cache = {
		tree: tree,
		fragment: lezer.TreeFragment.addTree(tree),
		classBindInfo: rebuildClassBindInfo(document, tree),
	};
	sourceCache.set(document.uri, cache);
	return cache;
}

function rebuildHeaderCache(document : vscode.TextDocument) {
	console.log("Rebuild header cache: " + document.fileName);
	const text = document.getText();
	let tree = parser.parse(text);
	let cache = {
		tree: tree,
		fragment: lezer.TreeFragment.addTree(tree),
	};
	headerCache.set(document.uri, cache);
	return cache;
}

function onDidRenameFiles(e : vscode.FileRenameEvent) {
    for (const file of e.files) {
        headerCache.delete(file.oldUri);
        sourceCache.delete(file.oldUri);
        // We don't copy the caches here, just in case there's a change of filetypes, in which case we'd need to rebuild anyway.
    }
}

function onDidDeleteFiles(e : vscode.FileDeleteEvent) {
    for (const file of e.files) {
        headerCache.delete(file);
        sourceCache.delete(file);
    }
}

function onDidChangeTextDocument(e : vscode.TextDocumentChangeEvent) {
    if (e.document.fileName.endsWith(".h")) {
        const cache = headerCache.get(e.document.uri);
        if (!cache) {
            rebuildHeaderCache(e.document);
        } else {
            console.log("Update header cache: " + e.document.fileName);
            cache.fragment = lezer.TreeFragment.applyChanges(
                cache.fragment,
                e.contentChanges.map(change => {
                    return {
                        fromA : e.document.offsetAt(change.range.start),
                        toA: e.document.offsetAt(change.range.end),
                        fromB: e.document.offsetAt(change.range.start),
                        toB: e.document.offsetAt(change.range.start) + change.text.length
                    };
                }
            ));
            cache.tree = parser.parse(e.document.getText(), cache.fragment);
        }
    } else if (e.document.fileName.endsWith(".cpp")) {
        const cache = sourceCache.get(e.document.uri);
        if (!cache) {
            rebuildSourceCache(e.document);
        } else {
            console.log("Update source cache: " + e.document.fileName);
            cache.fragment = lezer.TreeFragment.applyChanges(
                cache.fragment,
                e.contentChanges.map(change => {
                    return {
                        fromA : e.document.offsetAt(change.range.start),
                        toA: e.document.offsetAt(change.range.end),
                        fromB: e.document.offsetAt(change.range.start),
                        toB: e.document.offsetAt(change.range.start) + change.text.length
                    };
                }
            ));
            cache.tree = parser.parse(e.document.getText(), cache.fragment);
            cache.classBindInfo = rebuildClassBindInfo(e.document, cache.tree);
        }
    }
}

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.workspace.onDidRenameFiles(onDidRenameFiles));
    context.subscriptions.push(vscode.workspace.onDidDeleteFiles(onDidDeleteFiles));
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(onDidChangeTextDocument));
}

export function deactivate() {

}