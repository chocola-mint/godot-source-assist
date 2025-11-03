
import * as vscode from 'vscode';
import * as ClassDB from './ClassDB';

export default class HeaderCodeLensProvider implements vscode.CodeLensProvider {
    onDidChangeCodeLenses?: vscode.Event<void> | undefined;
    provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
        return new Promise(async resolve => {
            const sourceUri = vscode.Uri.file(document.fileName.slice(0, document.fileName.length - 1) + "cpp");
            try {
                let headerCacheData = await ClassDB.getHeaderCacheData(document.uri);
                let sourceCacheData = await ClassDB.getSourceCacheData(sourceUri);
                const classBindInfo = sourceCacheData.classBindInfo;
                
                let results : vscode.CodeLens[] = [];
                const text = document.getText();
                for (const classSpecifier of headerCacheData.tree.topNode.getChildren("ClassSpecifier")) {
                    const classTypeIdentifier = classSpecifier.getChild("TypeIdentifier");
                    const fieldDeclarationList = classSpecifier.getChild("FieldDeclarationList");
                    if (classTypeIdentifier && fieldDeclarationList) {
                        const className = text.substring(classTypeIdentifier.from, classTypeIdentifier.to);
                        // Note: BaseClassClause to get parent class.
                        for (const fieldDeclaration of fieldDeclarationList.getChildren("FieldDeclaration")) {
                            const functionDeclarator = fieldDeclaration.getChild("FunctionDeclarator");
                            if (functionDeclarator) {
                                const functionFieldIdentifier = functionDeclarator.getChild("FieldIdentifier");
                                if (functionFieldIdentifier) {
                                    const functionName = text.substring(functionFieldIdentifier.from, functionFieldIdentifier.to);
                                    const functionInfo = classBindInfo.functionBindings.get(`${className}::${functionName}`);
                                    if (functionInfo) {
                                        const range = new vscode.Range(
                                                document.positionAt(functionFieldIdentifier.from),
                                                document.positionAt(functionFieldIdentifier.to)
                                            );
                                        results.push(new vscode.CodeLens(range, functionInfo.codeLensCommand));
                                        if (functionInfo.linkedProperty) {
                                            const propertyInfo = classBindInfo.propertyBindings.get(functionInfo.linkedProperty);
                                            if (propertyInfo) {
                                                results.push(new vscode.CodeLens(range, propertyInfo.codeLensCommand));
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
        
                return resolve(results);
            } catch (e) {
                return resolve([]);
            }
        });
    }
    // resolveCodeLens?(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens> {
    // }

}