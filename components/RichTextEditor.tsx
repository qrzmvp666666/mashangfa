import React, { useMemo } from 'react';
import { Platform, TextInput, StyleSheet, View } from 'react-native';

let ReactQuill: any = null;
if (Platform.OS === 'web') {
  const rq = require('react-quill-new'); ReactQuill = rq.default ? rq.default : rq;
  require('react-quill-new/dist/quill.snow.css');
}

export default function RichTextEditor({ value, onChange, placeholder }: any) {
  const modules = useMemo(() => ({
    toolbar: [
      ['bold', 'italic'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'align': [] }],
      []
    ],
  }), []);

  if (Platform.OS === 'web' && ReactQuill) {
    return (
      <View style={styles.webContainer}>
        <ReactQuill
          theme="snow"
          value={value || ''}
          onChange={onChange}
          modules={modules}
          placeholder={placeholder}
        />
        <style>{`
          .quill {
            width: 100%;
            display: flex;
            flex-direction: column;
            border-radius: 8px;
            overflow: hidden;
          }
          .ql-toolbar, .ql-container, .ql-editor {
            box-sizing: border-box;
          }
          .ql-container {
            font-size: 14px;
            min-height: 40px;
          }
          .ql-editor {
            min-height: 40px;
            padding: 8px 12px;
          }
          .ql-toolbar.ql-snow {
            text-align: left;
            border-top-left-radius: 8px;
            border-top-right-radius: 8px;
            padding: 4px 8px;
          }
          .ql-container.ql-snow {
            border-bottom-left-radius: 8px;
            border-bottom-right-radius: 8px;
            border-color: #d1d5db;
            border-top: none;
          }
          .ql-toolbar.ql-snow {
            border-color: #d1d5db;
          }
          .ql-editor {
            min-height: 40px;
            padding: 8px 12px;
            max-height: 300px;
          }
        `}</style>
      </View>
    );
  }

  return (
    <TextInput
      style={styles.nativeEditor}
      value={value || ''}
      onChangeText={onChange}
      placeholder={placeholder || '此环境暂不支持富文本...'}
      multiline
      textAlignVertical="top"
    />
  );
}

const styles = StyleSheet.create({
  webContainer: {
    backgroundColor: '#fff',
    minHeight: 40,
    marginBottom: 0,
    width: '100%',
  },
  nativeEditor: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
  }
});