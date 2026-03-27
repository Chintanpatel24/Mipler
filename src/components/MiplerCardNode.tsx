import React, { memo } from 'react';
import type { NodeProps } from 'reactflow';
import type { CardData } from '../types';
import { NoteCard } from './cards/NoteCard';
import { ImageCard } from './cards/ImageCard';
import { GifCard } from './cards/GifCard';
import { VideoCard } from './cards/VideoCard';
import { PdfCard } from './cards/PdfCard';
import { WhoisCard } from './cards/WhoisCard';
import { DnsCard } from './cards/DnsCard';
import { ReverseImageCard } from './cards/ReverseImageCard';
import { OsintFrameworkCard } from './cards/OsintFrameworkCard';
import { CustomUrlCard } from './cards/CustomUrlCard';

const MiplerCardNodeComponent: React.FC<NodeProps<CardData>> = ({ id, data }) => {
  switch (data.cardType) {
    case 'note':
      return <NoteCard id={id} data={data} />;
    case 'image':
      return <ImageCard id={id} data={data} />;
    case 'gif':
      return <GifCard id={id} data={data} />;
    case 'video':
      return <VideoCard id={id} data={data} />;
    case 'pdf':
      return <PdfCard id={id} data={data} />;
    case 'whois':
      return <WhoisCard id={id} data={data} />;
    case 'dns':
      return <DnsCard id={id} data={data} />;
    case 'reverse-image':
      return <ReverseImageCard id={id} data={data} />;
    case 'osint-framework':
      return <OsintFrameworkCard id={id} data={data} />;
    case 'custom-url':
      return <CustomUrlCard id={id} data={data} />;
    default:
      return <NoteCard id={id} data={data} />;
  }
};

export const MiplerCardNode = memo(MiplerCardNodeComponent);
