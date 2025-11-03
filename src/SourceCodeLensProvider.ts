
import * as vscode from 'vscode';
import * as ClassDB from './ClassDB';

export default class SourceCodeLensProvider implements vscode.CodeLensProvider {
    onDidChangeCodeLenses?: vscode.Event<void> | undefined;
    provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
        return new Promise(async resolve => {
            try {
                const text = document.getText();
                let cache = await ClassDB.getSourceCacheData(document.uri);
                let results : vscode.CodeLens[] = [];
                for (const functionDefinition of cache.tree.topNode.getChildren("FunctionDefinition")) {
                    const functionIdentifier = functionDefinition.getChild("FunctionDeclarator")?.getChild("ScopedIdentifier");
                    if (functionIdentifier) {
                        const functionInfo = cache.classBindInfo.functionBindings.get(text.substring(functionIdentifier.from, functionIdentifier.to));
                        if (functionInfo) {
                            const range = new vscode.Range(
                                    document.positionAt(functionIdentifier.from),
                                    document.positionAt(functionIdentifier.to)
                                );
                            results.push(new vscode.CodeLens(range, functionInfo.codeLensCommand));
                            if (functionInfo.linkedProperty) {
                                const propertyInfo = cache.classBindInfo.propertyBindings.get(functionInfo.linkedProperty);
                                if (propertyInfo) {
                                    results.push(new vscode.CodeLens(range, propertyInfo.codeLensCommand));
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