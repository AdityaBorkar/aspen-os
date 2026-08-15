import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { Children, isValidElement, Suspense, use, useDeferredValue } from "react";
import type { ComponentProps, ReactNode } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";

import { rehypeWrapWords } from "./rehype-wrap-words";

export interface Processor {
  process: (content: string) => Promise<ReactNode>;
}

function createProcessor(): Processor {
  const processor = remark().use(remarkGfm).use(remarkRehype).use(rehypeWrapWords);

  return {
    async process(content) {
      const nodes = processor.parse({ value: content });
      const hast = await processor.run(nodes);

      return toJsxRuntime(hast, {
        Fragment,
        components: {
          ...defaultMdxComponents,
          img: undefined, // Use JSX
          pre: Pre,
        },
        development: false,
        jsx,
        jsxs,
      });
    },
  };
}

function Pre(props: ComponentProps<"pre">) {
  const child = Children.only(props.children);
  if (!isValidElement(child)) {
    return null;
  }
  // SAFETY: the single child of a <pre> block is the <code> element.
  const codeProps = child.props as ComponentProps<"code">;
  const content = codeProps.children;
  // SAFETY: <pre><code> children in processed markdown are always plain text strings.
  const text = content as string;
  if (String(text) !== text) {
    return null;
  }

  let lang =
    codeProps.className
      ?.split(" ")
      .find((token) => token.startsWith("language-"))
      ?.slice("language-".length) ?? "text";

  if (lang === "mdx") {
    lang = "md";
  }

  return <DynamicCodeBlock code={text.trimEnd()} lang={lang} />;
}

const processor = createProcessor();

export function Markdown({ text }: { text: string }) {
  const deferredText = useDeferredValue(text);

  return (
    // oxlint-disable-next-line react-perf/jsx-no-jsx-as-prop
    <Suspense fallback={<p className="invisible">{text}</p>}>
      <Renderer text={deferredText} />
    </Suspense>
  );
}

const cache = new Map<string, Promise<ReactNode>>();

function Renderer({ text }: { text: string }) {
  const result = cache.get(text) ?? processor.process(text);
  cache.set(text, result);

  return use(result);
}
