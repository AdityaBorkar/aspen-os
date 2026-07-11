import type { ElementContent, Root, RootContent } from "hast";
import { visit } from "unist-util-visit";

export function rehypeWrapWords() {
  return (tree: Root) => {
    visit(tree, ["text", "element"], (node, index, parent) => {
      if (node.type === "element" && node.tagName === "pre") return "skip";
      if (node.type !== "text" || !parent || index === undefined) return;

      const words = node.value.split(/(?=\s)/);

      const newNodes: ElementContent[] = words.flatMap((word) => {
        if (word.length === 0) return [];

        return {
          children: [{ type: "text", value: word }],
          properties: {
            class: "animate-fd-fade-in",
          },
          tagName: "span",
          type: "element",
        };
      });

      Object.assign(node, {
        children: newNodes,
        properties: {},
        tagName: "span",
        type: "element",
      } satisfies RootContent);
      return "skip";
    });
  };
}
