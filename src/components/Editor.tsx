import MonacoEditor from '@monaco-editor/react';

const DEFAULT_CODE = `import lvgl as lv

scr = lv.screen_active()

rect = lv.obj(scr)
rect.set_size(100, 100)
rect.set_pos(20, 20)
rect.set_style_bg_color(lv.color_hex(0x00FF00), 0)

lv.screen_load(scr)
print("green rect done")
`;

interface EditorProps {
  value?: string;
  onChange?: (value: string) => void;
}

export function Editor({ value = DEFAULT_CODE, onChange }: EditorProps) {
  return (
    <MonacoEditor
      height="100%"
      defaultLanguage="python"
      value={value}
      onChange={v => onChange?.(v ?? '')}
      theme="vs-dark"
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
