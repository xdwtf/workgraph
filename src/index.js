import { mmd } from 'mmd'

addEventListener('fetch', (ev) => {
  ev.respondWith(handleRequest(ev.request))
})

const template = (body) =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>@import url('https://fonts.googleapis.com/css2?family=Ubuntu&display=swap');@import url('https://fonts.googleapis.com/css2?family=Fira+Code&display=swap');body {width:80%;margin: auto;font-family: Ubuntu, sans-serif;color: #CDD9E5;background-color: #22272E;}button {border: none;border-radius: 6px;background-color: #347D39;color: #ffffff;cursor: pointer;font-size: 14px;padding: 5px 16px;}button:hover {background-color: #46954a;}a:visited,a,a:hover {color: #2c87f0;}img {width: 100%;height: auto;}blockquote {padding: 0 1em;color: #768390;border-left: 0.25em solid #444C56;}p code {background-color: #434b55;border-radius: 6px;padding: 4px;font-family: "Fira Code";font-size: 14px;}pre {width: 100%;overflow: scroll;padding: 5px;font-family: "Fira Code";}.edit {outline: none}.edit:hover {cursor: text;}.edit:empty:not(:focus):before {content: attr(data-ph);color: grey;}</style><title>Workgraph</title></head><body>${body}<h5><a href="https://github.com/snvmk/workgraph">github</a></h5></body></html>`

const scriptTemplate = (body) =>
  template(
    `<script>function post(){const edits=document.querySelectorAll('.edit');for(const i of edits){if(i.childNodes.length==0){alert('Please fill every field');return}};fetch('/',{method:'POST',body:JSON.stringify({article:edits[2].innerHTML,author:edits[1].innerHTML,title:edits[0].innerHTML})}).then(res=>res.text()).then(txt=>{window.location=txt})}</script>${body}`,
  )

const headers = {
  'Content-Type': 'text/html; charset=utf-8',
}

const allowedTags = [
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'strong',
  'em',
  'blockquote',
  'pre',
  'code',
  'ul',
  'ol',
  'li',
  'img',
  'a',
]

const allowedAttrs = {
  a: ['href'],
  img: ['src', 'alt'],
}

async function handleRequest(req) {
  const path = new URL(req.url).pathname
  if (path == '/' && req.method == 'GET') {
    return new Response(
      scriptTemplate(
        `<h1 class="edit" contenteditable="true" data-ph="Title"></h1><h3 class="edit" contenteditable="true" data-ph="Author"></h3><p class="edit" contenteditable="true" data-ph="Your content"></p><button onclick="post()">Publish</button>`,
      ),
      { headers },
    )
  } else if (path == '/' && req.method == 'POST') {
    const date = ~~(+new Date() / 1000)
    let { article, author, title } = await req.json()
    const sanitized = new HTMLRewriter()
      .on('*', {
        element(elem) {
          if (!allowedTags.includes(elem.tagName)) elem.remove()
          for (let attr of elem.attributes) {
            if (!allowedAttrs[elem.tagName].includes(attr[0]))
              elem.removeAttribute(attr[0])
          }
        },
      })
      .transform(
        new Response(
          mmd(
            article
              .replace(/<div>/g, '\n')
              .replace(RegExp('</div>', 'g'), '')
              .replace(/<br>/g, '')
              .replace(/&gt;/, '>')
              .replace(/&lt;/, '<'),
          ),
        ),
      )
    await ARTICLES.put(
      `${date}`,
      JSON.stringify({
        article: await sanitized.text(),
        author,
        title,
        date,
      }),
    )
    return new Response(`/${date}`, { status: 302 })
  } else if (path == '/favicon.ico') {
    return new Response('')
  } else {
    const body = JSON.parse(await ARTICLES.get(path.substring(1)))
    if (body === null) {
      return new Response(template(`<h1>Not found</h1>`), {
        headers,
        status: 404,
      })
    }

    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ]
    const d = new Date(body.date * 1000)
    const date = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
    return new Response(
      template(
        `<h1>${body.title}</h1><h3>${body.author} • ${date}</h3><main>${body.article}</main>`,
      ),
      {
        headers,
      },
    )
  }
}
