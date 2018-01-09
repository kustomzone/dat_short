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

        db.run('INSERT INTO links VALUES(1, "/a", "dat://3434e9e7e4d206d8dfbdfbb386deddb2fc667ef4f158d4dfefecf4ff9a4e771d/", NULL)',
               (err) => 0) //OK: can exist
    })
}


const get_max_id = (db, cb) => {
    db.each('SELECT MAX(id) AS max FROM links', (err, row) => {
        cb(db, row.max)
    })
}


const prepare_database = (fname, cb) => {
    const db = new sql.Database(fname)
    db.serialize(() => {
        create_base_db(db)
        get_max_id(db, cb)
    })
}


const get_template = (base_name, replace1='', replace2='') => {
    const text = fs.existsSync('config-' + base_name) ?
          fs.readFileSync('config-' + base_name, 'utf8') :
          fs.readFileSync(base_name, 'utf8')
    return text.replace('REPLACE1', replace1).replace('REPLACE2', replace2)
}


const ask_shortener = (req, res) => {
    const template = get_template('template.html')
    res.end(template)
}


const report_form_error = (res, error_text) => {
    res.write(get_template('error-form.html', error_text))
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
    console.log(fields.https, fields.https != '', fields)
    if ((fields.https != undefined || fields.https != '')
        || !fields.https.startsWith('https://')) {
        report_form_error(res, 'HTTPS url must start with https://')
        return true
    }
    return false
}


const write_database = (db, res, fields) => {
    res.write('Will write ' + fields)
    return true
}


const commit_shortener = (db, req, res, change_max) => {
    const form = new formd.IncomingForm()
    form.parse(req, (err, fields, files) => {
        has_form_errors(res, err, fields) || write_database (db, res, fields)
        res.end()
    })
}


const create_shortener = (db, req, res, change_max) => {
    res.writeHead(200, {'Content-Type': 'text/html'})
    req.method === 'POST' ?
        commit_shortener(db, req, res, change_max) :
        ask_shortener (req, res)
}


const check_short_url = (check_stmt, url, cb) => {
    check_stmt.get(url, (err, obj) => cb(err, obj))
}


const is_beaker = (user_agent) => user_agent.indexOf("Beaker") > -1


const redirect = (check_stmt, req, res) => {
    if (req.url === '/favicon.ico') return

    const process_url = (err, short_url) => {
        if (!short_url) {
            const template = get_template('error-redirect.html')
            res.writeHead(200, {'Content-Type': 'text/html'})
            res.end(template)
        }
        else {
            const redirect_url = is_beaker(req.headers['user-agent']) ?
                  short_url.dat : short_url.https
            res.writeHead(302, {'Location': redirect_url})
        }
        res.end()
    }
    
    check_short_url(check_stmt, req.url, process_url)
}


const run_server = (db, max_id) => {
    const check_stmt = db.prepare('SELECT * from links where url=?')

    process.on('SIGINT', (code) => {
        check_stmt.finalize()
        db.close()
        process.exit()
    })

    http.createServer((req, res) => {
        const current_max = max_id
        const change_max = (new_max) => {current_max = new_max}
        req.url === '/' ?
            create_shortener(db, req, res, change_max) :
            redirect(check_stmt, req, res)
    }).listen(8080)

}


prepare_database('my.db', run_server)
