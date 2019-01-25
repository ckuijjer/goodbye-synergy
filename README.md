# goodbye-synergy

This can be used to download your personal dossier containing e.g. payroll slips and yearly wage overviews from Synergy

## Prerequisites

Node.js v11 or higher should be installed

## Usage

* Go to Synergy and set the page size on your personal dossier to a number large enough to show all documents, e.g. 1000
* Open _index.js_ and change `const hid = 201226` into your pis code
* `npm install` -- to install the dependencies
* `npm start` -- to start the download

An instance of Chrome will open and will navigate through all documents of your personal dossier. It will download their attachments, or if they don't have any attachments make a PDF containing a screenshot of the document.

Downloads end up in the _output/_ directory

