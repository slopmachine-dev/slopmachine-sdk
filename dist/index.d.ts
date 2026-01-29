import React from 'react';

interface SlopImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    prompt: string;
    [key: string]: any;
}
declare const SlopImage: React.FC<SlopImageProps>;

export { SlopImage };
