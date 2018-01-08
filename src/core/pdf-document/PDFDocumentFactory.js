/* @flow */
import PDFDocument from './PDFDocument';
import PDFObjectIndex from './PDFObjectIndex';

import { PDFObject, PDFName, PDFStream } from '../pdf-objects';
import { PDFIndirectReference, PDFObjectStream } from '../pdf-structures';
import PDFParser from '../pdf-parser/PDFParser';
import { findInMap } from '../../utils';

import type { ParsedPDF } from '../pdf-parser/PDFParser';

class PDFDocumentFactory {
  static load = (data: Uint8Array): PDFDocument => {
    const pdfParser = new PDFParser();

    console.time('ParsePDF');
    const parsedPdf = pdfParser.parse(data);
    console.timeEnd('ParsePDF');

    console.time('Normalize');
    const index = PDFDocumentFactory.normalize(parsedPdf);
    console.timeEnd('Normalize');

    return PDFDocument.fromIndex(index);
  };

  // TODO: Need to throw out objects with "free" obj numbers...
  static normalize = ({
    dictionaries,
    arrays,
    original: { body },
    updates,
  }: ParsedPDF): Map<PDFIndirectReference, PDFObject> => {
    const index: Map<PDFIndirectReference, PDFObject> = new Map();

    // Remove Object Streams and Cross Reference Streams, because we've already
    // parsed the Object Streams into PDFIndirectObjects, and will just write
    // them as such and use normal xref tables to reference them.
    const shouldKeep = (object: PDFObject) =>
      !object.is(PDFObjectStream) &&
      !(
        object.is(PDFStream) &&
        object.dictionary.get('Type') === PDFName.from('XRef')
      );

    // Initialize index with objects in the original body
    body.forEach(({ pdfObject }, ref) => {
      if (shouldKeep(pdfObject)) index.set(ref, pdfObject);
    });

    // Update index with most recent version of each object
    // TODO: This could be omitted to recover a previous version of the document...
    updates.forEach(({ body: updateBody }) => {
      updateBody.forEach(({ pdfObject }, ref) => {
        if (shouldKeep(pdfObject)) index.set(ref, pdfObject);
      });
    });

    return index;
  };

  // static normalize = ({
  //   dictionaries,
  //   arrays,
  //   original: { body },
  //   updates,
  // }: ParsedPDF) => {
  //   // Update body with most recent version of each object
  //   updates.forEach(({ body: updateBody }) => {
  //     updateBody.forEach((obj, ref) => body.set(ref, obj));
  //   });
  //
  //   // // Replace references to PDFIndirectReferences with PDFIndirectObjects
  //   const failures = [
  //     ...dictionaries.map(dict => dict.dereference(body)),
  //     ...arrays.map(arr => arr.dereference(body)),
  //   ].filter(x => x.length > 0);
  //
  //   // Remove Object Streams and Cross Reference Streams, because we've already
  //   // parsed the Object Streams into PDFIndirectObjects, and will just write
  //   // them as such and use normal xref tables to reference them.
  //   body.forEach(({ pdfObject }, ref) => {
  //     if (pdfObject.is(PDFObjectStream)) body.delete(ref);
  //     else if (
  //       pdfObject.is(PDFStream) &&
  //       pdfObject.dictionary.get('Type') === PDFName.from('XRef')
  //     ) {
  //       body.delete(ref);
  //     }
  //   });
  //
  //   // Reset the objects numbers, starting from 0
  //   let objNum = 1;
  //   body.forEach(obj => {
  //     obj.setReferenceNumbers(objNum, 0);
  //     objNum += 1;
  //   });
  //
  //   return failures;
  // };
}

export default PDFDocumentFactory;