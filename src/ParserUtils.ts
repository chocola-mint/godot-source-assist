import { parser } from '@lezer/cpp';
import * as lezer from '@lezer/common';

export function logTree(tree : lezer.Tree, indents = 0, maxDepth = 30) : void {	
    tree.iterate({
        enter(node) {
            console.log("\t".repeat(indents) + node.name);
            if (indents < maxDepth) {
                indents++;
                return true;
            } else {
                return false;
            }
        },
        leave(node) {
            indents--;
        },
    });
}

export function getNodesOfNameInTree(tree : lezer.Tree, name : string, maxDepth : number) : lezer.SyntaxNode[] {
    let results = new Array<lezer.SyntaxNode>;
    let depth = 0;
    tree.iterate({
        enter(node) {
            if (depth >= maxDepth) {
                return false;
            }
            if (node.name === name) {
                results.push(node.node);
            }

            depth++;
            return true;
        },
        leave(node) {
            depth--;
        },
    });

    return results;
}
