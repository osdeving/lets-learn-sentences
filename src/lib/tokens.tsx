import type { MouseEventHandler } from "react";

interface ClickableTextProps {
  text: string;
  className: string;
  wordClassName: string;
  onWord: (word: string) => void;
}

export function ClickableText({ text, className, wordClassName, onWord }: ClickableTextProps) {
  const tokens = text.match(/[A-Za-z]+(?:[’'][A-Za-z]+)*|[^A-Za-z]+/g) ?? [text];
  return (
    <span className={className} lang="en-US">
      {tokens.map((token, index) => {
        if (!/^[A-Za-z]/.test(token)) return <span key={`${token}-${index}`}>{token}</span>;
        const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
          event.stopPropagation();
          onWord(token);
        };
        return (
          <button className={wordClassName} key={`${token}-${index}`} onClick={handleClick} type="button">
            {token}
          </button>
        );
      })}
    </span>
  );
}
