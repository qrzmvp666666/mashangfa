import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Platform } from 'react-native';

/**
 * 头像服务
 * 处理头像的上传、更新和删除
 */

const AVATAR_BUCKET = 'avatars';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * 上传头像到 Supabase Storage
 * @param userId 用户ID
 * @param fileUri 本地文件URI
 * @returns 上传后的公共URL
 */
export async function uploadAvatar(userId: string, fileUri: string): Promise<string> {
  try {
    console.log('Starting avatar upload for user:', userId);
    console.log('File URI:', fileUri);
    console.log('Platform:', Platform.OS);

    let base64: string;
    let fileSize: number | undefined;

    // Web 平台使用不同的方法
    if (Platform.OS === 'web') {
      try {
        // Web 端直接从 URI 读取（URI 通常已经是 base64 或 blob URL）
        const response = await fetch(fileUri);
        const blob = await response.blob();
        fileSize = blob.size;
        
        console.log('Web file size:', fileSize);

        // 检查文件大小
        if (fileSize > MAX_FILE_SIZE) {
          throw new Error('文件大小超过5MB限制');
        }

        // 转换为 base64
        base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            // 移除 data:image/...;base64, 前缀
            const base64String = result.split(',')[1];
            resolve(base64String);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        console.log('Web base64 length:', base64.length);
      } catch (error) {
        console.error('Error reading web file:', error);
        throw new Error('无法读取文件内容');
      }
    } else {
      // iOS/Android 使用文件系统
      try {
        // 读取文件信息
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        
        if (!fileInfo.exists) {
          throw new Error('文件不存在');
        }

        console.log('File info:', fileInfo);

        // 检查文件大小
        if (fileInfo.size && fileInfo.size > MAX_FILE_SIZE) {
          throw new Error('文件大小超过5MB限制');
        }

        // 读取文件为 base64
        base64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: 'base64',
        });

        console.log('Native base64 length:', base64.length);
      } catch (error) {
        console.error('Error reading native file:', error);
        throw new Error('无法读取文件信息');
      }
    }

    // 生成文件名：userId_timestamp.jpg
    const timestamp = Date.now();
    const fileName = `${userId}_${timestamp}.jpg`;
    const filePath = `${userId}/${fileName}`;

    console.log('Upload path:', filePath);

    // 将 base64 转换为 ArrayBuffer
    const arrayBuffer = decode(base64);
    console.log('ArrayBuffer size:', arrayBuffer.byteLength);

    // 上传到 Supabase Storage
    const { data, error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(filePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      throw new Error(`上传失败: ${error.message}`);
    }

    console.log('Upload successful:', data);

    // 获取公共URL
    const { data: publicUrlData } = supabase.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(filePath);

    console.log('Public URL:', publicUrlData.publicUrl);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Avatar upload error:', error);
    throw error;
  }
}

/**
 * 更新用户头像URL到数据库
 * @param userId 用户ID
 * @param avatarUrl 头像URL
 */
export async function updateUserAvatar(userId: string, avatarUrl: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId);

    if (error) {
      console.error('Update avatar error:', error);
      throw new Error(`更新头像失败: ${error.message}`);
    }
  } catch (error) {
    console.error('Update user avatar error:', error);
    throw error;
  }
}

/**
 * 删除旧头像文件
 * @param avatarUrl 旧头像的URL
 */
export async function deleteOldAvatar(avatarUrl: string | null): Promise<void> {
  if (!avatarUrl) return;

  try {
    // 从URL中提取文件路径
    // URL格式: https://xxx.supabase.co/storage/v1/object/public/avatars/userId/fileName.jpg
    const url = new URL(avatarUrl);
    const pathParts = url.pathname.split('/');
    const bucketsIndex = pathParts.findIndex(part => part === 'avatars');
    
    if (bucketsIndex === -1) return;

    // 提取 userId/fileName.jpg
    const filePath = pathParts.slice(bucketsIndex + 1).join('/');

    if (!filePath) return;

    // 删除文件
    const { error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Delete avatar error:', error);
      // 不抛出错误，因为删除旧文件失败不应该阻止上传新文件
    }
  } catch (error) {
    console.error('Delete old avatar error:', error);
    // 同样不抛出错误
  }
}

/**
 * 完整的头像更新流程
 * @param userId 用户ID
 * @param newAvatarUri 新头像的本地URI
 * @param oldAvatarUrl 旧头像的URL（可选）
 * @returns 新头像的公共URL
 */
export async function updateAvatarComplete(
  userId: string,
  newAvatarUri: string,
  oldAvatarUrl?: string | null
): Promise<string> {
  try {
    // 1. 上传新头像
    const newAvatarUrl = await uploadAvatar(userId, newAvatarUri);

    // 2. 更新数据库
    await updateUserAvatar(userId, newAvatarUrl);

    // 3. 删除旧头像（如果存在且不是默认头像）
    if (oldAvatarUrl && !oldAvatarUrl.includes('googleusercontent.com')) {
      await deleteOldAvatar(oldAvatarUrl);
    }

    return newAvatarUrl;
  } catch (error) {
    console.error('Complete avatar update error:', error);
    throw error;
  }
}
