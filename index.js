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

;(async () => {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()

  page.exposeFunction('saveFile', saveFile)

  await page.setViewport({ width: 1440, height: 800, deviceScaleFactor: 2 })
  //   await page._client.send('Page.setDownloadBehavior', {
  //     behavior: 'allow',
  //     downloadPath: './',
  //   })

  await page.goto(dossier)
  //   await page.pdf({ path: 'output/screenshot.pdf' }) // doesn't work with { headless: false } which I need to enter the username and password

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
            filename: `${columns[1].textContent}_${
              a.textContent.trim().match(withoutSize)[1]
            }`,
          })),
        ),
      }
    }),
  )

  // download the ones with an attachment
  // const documentsWithAttachments = documents.filter(
  //   d => d.attachments.length > 0,
  // )

  // await Promise.all(
  //   documentsWithAttachments
  //     .map(d => d.attachments)
  //     .reduce((acc, cur) => [...acc, ...cur], [])
  //     .map(async attachment => await page.evaluate(downloadUrl, attachment)),
  // )

  // make a pdf of the ones that don't have an attachment
  const documentsWithoutAttachment = documents.filter(
    d => d.attachments.length === 0,
  )

  for (let i = 0; i < documentsWithoutAttachment.length; i++) {
    const d = documentsWithoutAttachment[i]
    await page.goto(d.url)
    await page.screenshot({
      path: `${outputDirectory}/${d.id}_${d.subject}.png`,
      fullPage: true,
    })
  }

  // no Promise.all as we want the goto and screenshot to execute synchronously
  // await documentsWithoutAttachment.map(async d => {
  //   await page.goto(d.url)
  //   await page.screenshot({
  //     path: `${outputDirectory}/${d.id}_${d.subject}.png`,
  //     fullPage: true,
  //   })
  // })

  // console.log({ documentsWithoutAttachment })

  // go to the next page
  //   await page.click(
  //     '#ListHR_Header > tbody > tr:nth-child(3) > td:nth-child(9) > table > tbody > tr > td > a',
  //   )

  //   const document = documents.filter(d => d.attachments.length > 0)[0]
  //   const url = document.attachments[0].url

  //   await page.evaluate(downloadUrl, url)

  //   const nextButtonSelector = '.pgFooterButton[title="CTRL ALT X-Next"'
  //   await page.click(nextButtonSelector)

  await browser.close()
})()
