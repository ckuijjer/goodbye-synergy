const puppeteer = require('puppeteer')
const fs = require('fs')

const outputDirectory = 'output/'
const base = 'https://employees.exact.com'
const hid = 201226
const dossier = `${base}/docs/DocPersonHR.aspx?Res_ID=${hid}&ReturnTo=HRMDossierRpt.aspx?EmpID=${hid}`

if (!fs.existsSync(outputDirectory)) {
  fs.mkdirSync(outputDirectory)
}

const downloadUrl = async ({ url, filename }) =>
  fetch(url, {
    responseType: 'arraybuffer',
  })
    .then(response => response.arrayBuffer())
    .then(arrayBuffer =>
      btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          '',
        ),
      ),
    )
    .then(base64 => window.saveFile(base64, filename))

const saveFile = (data, filename) =>
  new Promise((resolve, reject) => {
    fs.writeFile(
      `${outputDirectory}${filename}`,
      data,
      'base64',
      (err, text) => {
        if (err) reject(err)
        else resolve()
      },
    )
  })

const extractSinglePage = async page => {
  const currentUrl = page.url()

  console.log('extractSingle page for', currentUrl)

  const allRowsSelector = '#ListHR_Header .DataLight, #ListHR_Header .DataDark'

  const documents = await page.$$eval(allRowsSelector, rows =>
    rows.map(row => {
      const columns = row.querySelectorAll('td')

      const withoutSize = /(.*) \(.*\)/

      return {
        id: columns[1].textContent,
        url: columns[1].querySelector('a').href,
        subject: columns[2].textContent,
        attachments: Array.from(
          Array.from(columns[8].querySelectorAll('a')).map(a => ({
            url: a.href,
            filename: `${columns[1].textContent}_${a.textContent
              .trim()
              .match(withoutSize)[1]
              .replace(/\//g, '_')}`,
          })),
        ),
      }
    }),
  )

  const nextButtonSelector = '.pgFooterButton[title="CTRL ALT X-Next"]'
  const hasNextButton = await page.$$eval(
    nextButtonSelector,
    elements => elements.length > 0,
  )

  // download the ones with an attachment
  const documentsWithAttachments = documents.filter(
    d => d.attachments.length > 0,
  )

  await Promise.all(
    documentsWithAttachments
      .map(d => d.attachments)
      .reduce((acc, cur) => [...acc, ...cur], [])
      .map(async attachment => await page.evaluate(downloadUrl, attachment)),
  )

  // make a pdf of the ones that don't have an attachment
  const documentsWithoutAttachment = documents.filter(
    d => d.attachments.length === 0,
  )

  for (let i = 0; i < documentsWithoutAttachment.length; i++) {
    const d = documentsWithoutAttachment[i]
    await page.goto(d.url)
    await page.screenshot({
      path: `${outputDirectory}/${d.id}_${d.subject.replace(/\//g, '_')}.png`,
      fullPage: true,
    })
  }

  // await page.goto(currentUrl)

  // console.log({ currentUrl })

  // if (hasNextButton) {
  // await page.click(nextButtonSelector)
  // await extractSinglePage(page)
  // }
}

;(async () => {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()

  page.exposeFunction('saveFile', saveFile)

  await page.setViewport({ width: 1440, height: 800, deviceScaleFactor: 2 })

  await page.goto(dossier)

  // manually set the pagesize to 1000 or really high as pagination doesn't work yet
  await extractSinglePage(page)

  await browser.close()
})()
