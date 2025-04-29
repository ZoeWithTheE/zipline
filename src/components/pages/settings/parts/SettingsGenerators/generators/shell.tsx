import { UploadHeaders } from '@/lib/uploader/parseHeaders';
import { GeneratorOptions, copier, download } from '../GeneratorButton';

export function shell(token: string, type: 'file' | 'url', options: GeneratorOptions) {
  const curl = [
    'curl',
    '-H',
    `"authorization: ${token}"`,
    `${window.origin}/api/${type === 'file' ? 'upload' : 'user/urls'}`,
  ];

  if (type === 'file') {
    curl.push('-F', '"file=@$1;type=$(file --mime-type -b "$1")"');
    curl.push('-H', "'content-type: multipart/form-data'");
  } else {
    curl.push('-H', "'content-type: application/json'");
  }

  const toAddHeaders: UploadHeaders = {};

  if (options.deletesAt !== null && type === 'file') {
    toAddHeaders['x-zipline-deletes-at'] = options.deletesAt;
  } else {
    delete toAddHeaders['x-zipline-deletes-at'];
  }

  if (options.format !== 'default' && type === 'file') {
    toAddHeaders['x-zipline-format'] = options.format;
  } else {
    delete toAddHeaders['x-zipline-format'];
  }

  if (options.imageCompressionPercent !== null && type === 'file') {
    toAddHeaders['x-zipline-image-compression-percent'] = options.imageCompressionPercent.toString();
  } else {
    delete toAddHeaders['x-zipline-image-compression-percent'];
  }

  if (options.maxViews !== null) {
    toAddHeaders['x-zipline-max-views'] = options.maxViews.toString();
  } else {
    delete toAddHeaders['x-zipline-max-views'];
  }

  if (options.noJson === true) {
    toAddHeaders['x-zipline-no-json'] = 'true';
  } else {
    delete toAddHeaders['x-zipline-no-json'];
  }

  if (options.addOriginalName === true && type === 'file') {
    toAddHeaders['x-zipline-original-name'] = 'true';
  } else {
    delete toAddHeaders['x-zipline-original-name'];
  }

  if (options.overrides_returnDomain !== null) {
    toAddHeaders['x-zipline-domain'] = options.overrides_returnDomain;
  } else {
    delete toAddHeaders['x-zipline-domain'];
  }

  for (const [key, value] of Object.entries(toAddHeaders)) {
    curl.push('-H', `"${key}: ${value}"`);
  }

  let script;

  if (type === 'file') {
    script = `#!/bin/bash
${curl.join(' ')}${options.noJson ? '' : ' | jq -r .files[0].url'}${
      options.unix_useEcho ? '' : ` | ${copier(options)}`
    }
`;
  } else {
    script = `#!/bin/bash
${curl.join(' ')} -d "{\\"destination\\": \\"$1\\"}"${
      options.noJson ? '' : ' | jq -r .url'
    }${options.unix_useEcho ? '' : ` | ${copier(options)}`}
`;
  }

  return download(`zipline-script-${type}.sh`, script);
}
