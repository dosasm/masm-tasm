import { ASTNode, ProgramNode } from "./nodes";

function flattenTreeDFS(root: ProgramNode): ASTNode[] {
    const result: ASTNode[] = [];

    function traverse(node: ASTNode) {
        result.push(node);
        if (node.type === "Conditional") {
            if (node.thenBody) {
                node.thenBody.forEach(child => traverse(child));
            }
            if (node.elseBody) {
                node.elseBody.forEach(child => traverse(child));
            }
        }
        if (node.type === "Macro" || node.type === "Program"|| node.type === "Segment"||node.type==="Procedure") {
            if (node.body) {
                node.body.forEach(child => traverse(child))
            }
        }
    }

    traverse(root);
    return result;
}

export class FlattenTree {
    nodes: ASTNode[]
    constructor(private ast: ProgramNode) {
        this.nodes = flattenTreeDFS(ast);
    }
    search(index: number, allowTypes = undefined) {
        for (const n of this.nodes.reverse()) {
            let allowed = true;
            if (allowTypes !== undefined) {
                allowed = n.type in allowTypes;
            }
            if (allowed && n.trace.index <= index && index < n.trace.end) {
                return n
            }
        }
    }
}

function flattenTreeBFS<T extends { children: T[] }>(root: T): T[] {
    const result: T[] = [];
    const queue: T[] = [root];

    while (queue.length > 0) {
        const node = queue.shift()!;
        result.push(node);
        queue.push(...node.children);
    }

    return result;
}

export function search(ast: ProgramNode, index: number, allowTypes = undefined) {
    return new FlattenTree(ast).search(index,allowTypes)
}