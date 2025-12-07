import { type JSX, Show, createSignal, onCleanup, onMount } from "solid-js";
import { Portal } from "solid-js/web";

interface PopoverProps {
  trigger: (props: { onClick: (event: MouseEvent) => void }) => JSX.Element;
  children: (props: { close: () => void }) => JSX.Element;
  contentClass?: string;
  triggerWrapperClass?: string;
  triggerWrapperStyle?: JSX.CSSProperties;
}

export default function Popover(props: PopoverProps) {
  const [isOpen, setIsOpen] = createSignal(false);
  // oxlint-disable-next-line no-unassigned-vars
  let triggerRef: HTMLDivElement | undefined;
  let contentRef: HTMLDivElement | undefined;
  const [position, setPosition] = createSignal({ left: 0, top: 0 });

  const toggle = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isOpen()) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const close = () => setIsOpen(false);

  const handleClickOutside = (event: MouseEvent) => {
    if (
      isOpen() &&
      contentRef &&
      !(contentRef as HTMLElement).contains(event.target as Node) &&
      triggerRef &&
      !(triggerRef as HTMLElement).contains(event.target as Node)
    ) {
      setIsOpen(false);
    }
  };

  onMount(() => {
    document.addEventListener("click", handleClickOutside);
    onCleanup(() => document.removeEventListener("click", handleClickOutside));
  });

  return (
    <>
      <div
        ref={triggerRef}
        class={props.triggerWrapperClass}
        style={{ display: "inline-block", ...props.triggerWrapperStyle }}
      >
        {props.trigger({ onClick: toggle })}
      </div>
      <Show when={isOpen()}>
        <Portal>
          <div
            ref={(el) => {
              contentRef = el;
              if (triggerRef) {
                // Use requestAnimationFrame to ensure layout is complete
                requestAnimationFrame(() => {
                  const triggerRect = (triggerRef as HTMLElement).getBoundingClientRect();
                  const contentRect = el.getBoundingClientRect();
                  const viewportHeight = window.innerHeight;

                  let top = triggerRect.bottom + window.scrollY + 5;
                  let left = triggerRect.left + window.scrollX;

                  // Check if it overflows the bottom
                  if (triggerRect.bottom + contentRect.height + 5 > viewportHeight) {
                    // Check if it fits above
                    if (triggerRect.top - contentRect.height - 5 > 0) {
                      top = triggerRect.top + window.scrollY - contentRect.height - 5;
                    }
                  }

                  setPosition({ left, top });
                });
              }
            }}
            class={props.contentClass}
            style={{
              left: `${position().left}px`,
              opacity: position().top === 0 ? 0 : 1,
              position: "absolute",
              top: `${position().top}px`,
              "z-index": 1000, // Hide until positioned
            }}
          >
            {props.children({ close })}
          </div>
        </Portal>
      </Show>
    </>
  );
}
