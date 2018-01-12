const fs = require('fs')
const http = require('http')

const formd = require('formidable')
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

        db.run('INSERT INTO links VALUES(1, "/a", "dat://3434e9e7e4d206d8dfbdfbb386deddb2fc667ef4f158d4dfefecf4ff9a4e771d/", "https://shortener-tiago.hashbase.io/")',
               (err) => 0) //OK: can exist
        db.run('INSERT INTO links VALUES(2, "/b", "dat://3434e9e7e4d206d8dfbdfbb386deddb2fc667ef4f158d4dfefecf4ff9a4e771d/", null)',
               (err) => 0) //OK: can exist
    })
}


const get_max_id_url = (db, cb) => {
    db.each('SELECT MAX(id) AS max FROM links', (err, row) => {
        const my_max = row.max
        db.each('SELECT url FROM links WHERE id=' + my_max.toString(),
                (err, row) => {
                    cb(db, my_max, row.URL)
                })})
}


const prepare_database = (fname, cb) => {
    const db = new sql.Database(fname)
    db.serialize(() => {
        create_base_db(db)
        cb(db)
    })
}


const get_template = (base_name,
		      replace1='', replace2='', replace3='') => {
    const text = fs.existsSync('config-' + base_name) ?
          fs.readFileSync('config-' + base_name, 'utf8') :
          fs.readFileSync(base_name, 'utf8')
    return text.replace(/REPLACE1/g, replace1)
               .replace(/REPLACE2/g, replace2)
               .replace(/REPLACE3/g, replace3)
}


const ask_shortener = (req, res) => {
    const template = get_template('template.html')
    res.end(template)
}


const report_form_error = (res, error_text) => {
    res.write(get_template('error-form.html', error_text))
    res.end()
}


const has_form_errors = (res, err, fields) => {
    if (fields.dat === undefined || fields.dat === '') {
        report_form_error(res, 'No dat specified')
        return true
    }
    if (!fields.dat.startsWith('dat://')) {
        report_form_error(res, 'Dat url must start with dat://')
        return true
    }
    if (!((fields.https === undefined || fields.https === '')
          || fields.https.startsWith('https://'))) {
        report_form_error(res, 'HTTPS url must start with https://')
        return true
    }
    return false
}


const create_new_url = (old_url) => {
    if (old_url[0] === '/') return  '/' + create_new_url(old_url.substring(1))
    if (old_url === 'z'.repeat(old_url.length)) {
        return 'a'.repeat(old_url.length + 1)
    }
        //122 = z

    const first =  old_url.charCodeAt(0)
    const rest = old_url.substring(1)
    return first === 122 ?
        'z' + create_new_url(rest) :
        String.fromCharCode(first + 1) + rest
}


const write_database = (db, req, res, fields) => {
    get_max_id_url(db, (db, max_id, url) => {
	const new_url = create_new_url(url)
        insert_db_url.run(max_id + 1, new_url, fields.dat, fields.https)
	const short_url = req.headers.host + new_url
	res.end(get_template('done.html', short_url,
			     fields.dat, fields.https))
    })
}


const commit_shortener = (db, req, res) => {
    const form = new formd.IncomingForm()
    form.parse(req, (err, fields, files) => {
        has_form_errors(res, err, fields) ||
            write_database (db, req, res, fields)
    })
}


const create_shortener = (db, req, res) => {
    res.writeHead(200, {'Content-Type': 'text/html'})
    req.method === 'POST' ?
        commit_shortener(db, req, res) :
        ask_shortener (req, res)
}


const check_short_url = (url, cb) => {
    check_db_short.get(url, (err, obj) => cb(err, obj))
}


const is_beaker = (user_agent) => user_agent.indexOf("Beaker") > -1


const redirect = (req, res) => {
    if (req.url === '/favicon.ico') return

    const process_url = (err, short_url) => {
        if (!short_url) {
            const template = get_template('template.html')
            res.writeHead(200, {'Content-Type': 'text/html'})
            res.end(template)
        }
        else {
            const redirect_url = is_beaker(req.headers['user-agent']) ?
                  short_url.dat : short_url.https
	    if (redirect_url) {
		res.writeHead(302, {'Location': redirect_url})
	    } else {
	    }
        }
        res.end()
    }
    
    check_short_url(req.url, process_url)
}


var check_db_short
var insert_db_url

const run_server = (db) => {
    check_db_short = db.prepare('SELECT * from links where url=?')
    insert_db_url = db.prepare(`INSERT INTO links (id, URL, dat, https)
                                     VALUES (?, ?, ?, ?)`)

    process.on('SIGINT', (code) => {
        check_db_short.finalize()
        db.close()
        process.exit()
    })

    http.createServer((req, res) => {
        req.url === '/' ?
            create_shortener(db, req, res) :
            redirect(req, res)
    }).listen(8080)

}


prepare_database('my.db', run_server)
