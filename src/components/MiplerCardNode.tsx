import React, { memo } from 'react';
import type { NodeProps } from 'reactflow';
import type { CardData } from '../types';
import { NoteCard } from './cards/NoteCard';
import { ImageCard } from './cards/ImageCard';
import { PdfCard } from './cards/PdfCard';
import { WhoisCard } from './cards/WhoisCard';
import { DnsCard } from './cards/DnsCard';
import { ReverseImageCard } from './cards/ReverseImageCard';
import { OsintFrameworkCard } from './cards/OsintFrameworkCard';
import { CustomUrlCard } from './cards/CustomUrlCard';
import { AgentCard } from './cards/AgentCard';
import { AgentOutputCard } from './cards/AgentOutputCard';
import { AiGeneratedCard } from './cards/AiGeneratedCard';
import { PredictionCard } from './cards/PredictionCard';
import { ImportCard } from './cards/ImportCard';
import { InvestigationPreviewCard } from './cards/InvestigationPreviewCard';
import { ReportAgentCard } from './cards/ReportAgentCard';
import { AgentAnswerCard } from './cards/AgentAnswerCard';
import { WorkflowNodeCard } from './cards/WorkflowNodeCard';
import { TitleCard } from './cards/TitleCard';
import { QuestionCard } from './cards/QuestionCard';
import { DataSupplierCard } from './cards/DataSupplierCard';
import { AgentGroupCard } from './cards/AgentGroupCard';
import { CardMakerCard } from './cards/CardMakerCard';

const WORKFLOW_TYPES = new Set([
  'http-request', 'code-exec', 'transform', 'condition', 'loop', 'merge',
  'swarm-agent', 'osint-whois', 'osint-dns', 'osint-subdomain',
  'osint-ip', 'osint-email', 'osint-portscan', 'delay', 'webhook', 'trigger',
]);

const MiplerCardNodeInner: React.FC<NodeProps<CardData>> = ({ id, data }) => {
  if (WORKFLOW_TYPES.has(data.cardType)) {
    return <WorkflowNodeCard id={id} data={data} />;
  }

  switch (data.cardType) {
    case 'note':
      return <NoteCard id={id} data={data} />;
    case 'image':
      return <ImageCard id={id} data={data} />;
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
    case 'title-card':
      return <TitleCard id={id} data={data} />;
    case 'agent':
      return <AgentCard id={id} data={data} />;
    case 'agent-output':
      return <AgentOutputCard id={id} data={data} />;
    case 'ai-generated':
      return <AiGeneratedCard id={id} data={data} />;
    case 'prediction':
      return <PredictionCard id={id} data={data} />;
    case 'import-card':
      return <ImportCard id={id} data={data} />;
    case 'investigation-preview':
      return <InvestigationPreviewCard id={id} data={data} />;
    case 'report-agent':
      return <ReportAgentCard id={id} data={data} />;
    case 'agent-answer':
      return <AgentAnswerCard id={id} data={data} />;
    case 'question-card':
      return <QuestionCard id={id} data={data} />;
    case 'data-supplier':
      return <DataSupplierCard id={id} data={data} />;
    case 'agent-group':
      return <AgentGroupCard id={id} data={data} />;
    case 'card-maker':
      return <CardMakerCard id={id} data={data} />;
    default:
      return <NoteCard id={id} data={data} />;
  }
};

export const MiplerCardNode = memo(MiplerCardNodeInner);
