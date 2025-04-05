import { RenderMode } from '@/components/pages/upload/renderMode';
import { Alert, Button } from '@mantine/core';
import { IconEyeFilled } from '@tabler/icons-react';
import { useState } from 'react';
import KaTeX from './KaTeX';
import Markdown from './Markdown';
import HighlightCode from './code/HighlightCode';
import { parseAsStringEnum, useQueryState } from 'nuqs';

export function RenderAlert({
  renderer,
  state,
  change,
}: {
  renderer: string;
  state: boolean;
  change: (s: boolean) => void;
}) {
  return (
    <Alert
      icon={<IconEyeFilled size='1rem' />}
      variant='outline'
      mb='sm'
      styles={{ message: { marginTop: 0 } }}
    >
      {!state ? `This file is rendered through ${renderer}` : `This file can be rendered through ${renderer}`}
      <Button
        mx='sm'
        variant='outline'
        size='compact-sm'
        onClick={() => change(!state)}
        pos='absolute'
        right={0}
      >
        {state ? 'Show' : 'Hide'} rendered version
      </Button>
    </Alert>
  );
}

export default function Render({
  mode,
  language,
  code,
}: {
  mode: RenderMode;
  language: string;
  code: string;
}) {
  const [overrideRender] = useQueryState('orender', parseAsStringEnum<RenderMode>(Object.values(RenderMode)));

  const [highlight, setHighlight] = useState(false);

  switch (overrideRender || mode) {
    case RenderMode.Katex:
      return (
        <>
          <RenderAlert renderer='KaTeX' state={highlight} change={(s) => setHighlight(s)} />

          {highlight ? <HighlightCode language={language} code={code} /> : <KaTeX tex={code} />}
        </>
      );
    case RenderMode.Markdown:
      return (
        <>
          <RenderAlert renderer='Markdown' state={highlight} change={(s) => setHighlight(s)} />

          {highlight ? <HighlightCode language={language} code={code} /> : <Markdown md={code} />}
        </>
      );
    default:
      return <HighlightCode language={language} code={code} />;
  }
}
