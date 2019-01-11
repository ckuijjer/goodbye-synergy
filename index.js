const puppeteer = require('puppeteer')
const fs = require('fs')

const base = 'https://employees.exact.com'
const hid = 201226
const dossier = `${base}/docs/DocPersonHR.aspx?Res_ID=${hid}&ReturnTo=HRMDossierRpt.aspx?EmpID=${hid}`

const downloadUrl = async url =>
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
    .then(base64 => window.saveFile(base64, 'example.pdf'))

const saveFile = (data, filename) =>
  new Promise((resolve, reject) => {
    fs.writeFile(filename, data, 'base64', (err, text) => {
      if (err) reject(err)
      else resolve()
    })
  })

;(async () => {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()

  page.exposeFunction('saveFile', saveFile)

  //   await page._client.send('Page.setDownloadBehavior', {
  //     behavior: 'allow',
  //     downloadPath: './',
  //   })

  await page.goto(dossier)
  await page.screenshot({ path: 'example.png' })

  const allRowsSelector = '#ListHR_Header .DataLight, #ListHR_Header .DataDark'

  const documents = await page.$$eval(allRowsSelector, rows =>
    rows.map(row => {
      const columns = row.querySelectorAll('td')

      return {
        hid: columns[1].textContent,
        url: columns[1].querySelector('a').href,
        subject: columns[2].textContent,
        attachments: Array.from(
          Array.from(columns[8].querySelectorAll('a')).map(a => ({
            url: a.href,
            filename: a.textContent.trim(),
            element: a,
          })),
        ),
      }
    }),
  )

  // download the ones with an attachment
  //   const documents = documents.filter(d => d.attachments.length > 0)

  //   await Promise.all([])

  // make a pdf of the ones that don't have an attachment

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
