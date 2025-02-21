import { UploadHeaders } from '@/lib/uploader/parseHeaders';
import { GeneratorOptions, download } from '../GeneratorButton';

export function ishare(token: string, type: 'file' | 'url', options: GeneratorOptions) {
  if (type === 'url') {
    // unsupported in ishare
    return;
  }

  const config = {
    name: `Zipline - ${window.location.origin} - ${type === 'file' ? 'File' : 'URL'}`,
    requestURL: `${window.location.origin}/api/upload`,
    headers: {},
    fileFormName: 'file',
    requestBodyType: 'multipartFormData',
    responseURL: `{{files[0].url}}`,
  };

  const toAddHeaders: UploadHeaders = {
    authorization: token,
  };

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

  // if (options.noJson === true) {
  //   // unsupported in ishare
  // } else {
  //   delete toAddHeaders['x-zipline-no-json'];
  // }

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
    (config as any).headers[key] = value;
  }

  return download(`zipline-${type}.iscu`, JSON.stringify(config, null, 2));
}
