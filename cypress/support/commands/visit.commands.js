import * as CRC32 from 'crc-32';
import {Base64} from 'js-base64';
import {padStart} from '../../../src/app/shared/utils/string.utils';

Cypress.Commands.add('visitAndWait', url => {
  cy.visit(url);
  cy.get('[data-test="lumeer-logo"]', {timeout: 30000}).should('be.visible');
});

Cypress.Commands.add('visitSearchCollections', () => {
  cy.visitAndWait(`/w/${Cypress.env('organizationCode')}/${Cypress.env('projectCode')}/view/search/tables`);
});

Cypress.Commands.add('visitTable', collectionId => {
  const workspacePath = `/w/${Cypress.env('organizationCode')}/${Cypress.env('projectCode')}`;
  const query = collectionId ? encodeQuery(JSON.stringify({s: [{c: collectionId}]})) : '';

  cy.visitAndWait(`${workspacePath}/view/table?q=${query}`).wait(2000);
});

function encodeQuery(query) {
  const base64 = Base64.encode(query, true);
  const crc = calculateQueryCRC(base64);
  return base64 + crc;
}

function calculateQueryCRC(query) {
  const crcNumber = CRC32.str(query) + Math.pow(16, 8) / 2;
  return padStart(crcNumber.toString(16), 8, '0');
}
