import React from 'react';

interface AvatarProps {
  avatar: string;
  size?: number;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ avatar, size = 40, className = '' }) => {
  const avatarPath = `/assets/images/avatars/${avatar}.svg`;
  //console.log('[AVATAR] Rendering avatar:', avatar, 'Path:', avatarPath);
  
  return (
    <img
      src={avatarPath}
      alt={`${avatar} avatar`}
      width={size}
      height={size}
      className={`avatar ${className}`}
      style={{
        borderRadius: '50%',
        objectFit: 'cover',
        border: '2px solid #e0e0e0'
      }}
      onLoad={() => {
        //console.log('[AVATAR] Successfully loaded:', avatarPath);
      }}
      onError={(e) => {
        //console.log('[AVATAR] Failed to load:', avatarPath, 'Falling back to cat.svg');
        // Fallback to a default avatar if the image fails to load
        const target = e.target as HTMLImageElement;
        target.src = '/assets/images/avatars/cat.svg';
      }}
    />
  );
};

export default Avatar;