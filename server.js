const fs = require('fs')
const http = require('http')

const sql = require('sqlite3')


const create_base_db = (db) => {
    db.serialize(() => {
        db.run(`
	       CREATE TABLE links (
                   id INTEGER UNIQUE,
                  URL TEXT UNIQUE,
                  dat TEXT NOT NULL,
                https TEXT)`,
               (err) => 0) //OK: can exist
        db.run('CREATE INDEX links_id ON links (id)',
               (err) => 0) //OK: can exist
        db.run('CREATE INDEX links_url ON links (url)',
               (err) => 0) //OK: can exist

        db.run('INSERT INTO links VALUES(1, "a", "dat://3434e9e7e4d206d8dfbdfbb386deddb2fc667ef4f158d4dfefecf4ff9a4e771d/", NULL)',
               (err) => 0) //OK: can exist
    })

}


var max_id // A lovely global variable :(

const get_max_id = (db) => {
    var max_id
    db.serialize(() => {
        db.each("SELECT MAX(id) AS max FROM links", (err, row) => {
            max_id = row.max
	})})
    return max_id
}


const prepare_database = (fname) => {
    const db = new sql.Database(fname)
    create_base_db(db)
    max_id = get_max_id(db)
    return db
}


const create_shortener = (req, res) => {
    const template = fs.readFileSync('template.html')
    res.writeHead(200, {'Content-Type': 'text/html'})
    res.end(template)
    console.log(req)
    console.log(req.method === 'POST')
}


const check_short_url = (url) => {
    return true
}


const is_beaker = (user_agent) => user_agent.indexOf("Beaker") > -1


const redirect = (req, res) => {
    const short_url = check_short_url(req.url)
    if (!short_url) {
	//XXX report error
	return
    }
    const redirect_url = is_beaker(req.headers['user-agent']) ?
	  short_url.dat : short_url.https
    res.writeHead(302, {'Location': redirect_url})
}


const db = prepare_database('my.db')

process.on('SIGINT', (code) => {
    db.close()
    process.exit()
})

http.createServer((req, res) => {
    req.url === '/' ?
	create_shortener(req, res) : redirect(req, res)
    res.end()
}).listen(8080)
