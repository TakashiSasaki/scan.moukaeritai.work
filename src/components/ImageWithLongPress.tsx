import React from 'react';
import { useLongPress } from '../lib/useLongPress';

interface ImageWithLongPressProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  url: string;
  wrapperClassName?: string;
  children?: React.ReactNode;
  className?: string;
  alt?: string;
  key?: React.Key;
}

export function ImageWithLongPress({ url, wrapperClassName, children, className, ...props }: ImageWithLongPressProps) {
  const longPressProps = useLongPress(url, 400); // 400ms long press

  return (
    <div className={`relative ${wrapperClassName || ''}`} {...longPressProps}>
      <img src={url} className={className} referrerPolicy="no-referrer" {...props} />
      {children}
    </div>
  );
}
