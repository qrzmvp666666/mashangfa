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
          .ql-container {
            font-size: 16px;
            min-height: 100px;
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
    minHeight: 150,
    marginBottom: 10,
  },
  nativeEditor: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
  }
});