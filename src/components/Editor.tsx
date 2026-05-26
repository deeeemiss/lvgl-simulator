import MonacoEditor from '@monaco-editor/react';
import { useTheme } from '../ThemeContext';

const DEFAULT_CODE = `import lvgl as lv

scr = lv.screen_active()

rect = lv.obj(scr)
rect.set_size(100, 100)
rect.set_pos(20, 20)
rect.set_style_bg_color(lv.color_hex(0x00FF00), 0)

lv.screen_load(scr)
print("green rect done")
`;

const DEFAULT_CODE_CPP = `#include "lvgl.h"

void lv_user_setup(void) {
    lv_obj_t *label = lv_label_create(lv_screen_active());
    lv_label_set_text(label, "Hello LVGL!");
    lv_obj_center(label);
}
`;

export const DEFAULT_CODES: Record<string, string> = {
  python: DEFAULT_CODE,
  cpp:    DEFAULT_CODE_CPP,
};

interface EditorProps {
  value?: string;
  language?: string;
  onChange?: (value: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editorRef?: React.MutableRefObject<any>;
}

export function Editor({ value = DEFAULT_CODE, language = 'python', onChange, editorRef }: EditorProps) {
  const { theme } = useTheme();
  return (
    <MonacoEditor
      height="100%"
      language={language}
      value={value}
      onChange={v => onChange?.(v ?? '')}
      theme={theme.monacoTheme}
      onMount={(editor) => {
        if (editorRef) editorRef.current = editor;
      }}
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        wordWrap: 'on',
        tabSize: 4,
        insertSpaces: true,
        renderWhitespace: 'selection',
        automaticLayout: true,
      }}
    />
  );
}

export { DEFAULT_CODE };
