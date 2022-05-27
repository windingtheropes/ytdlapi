const express = require("express")
const app = express()
const port = 3000
const cors = require("cors")
const { exec } = require('child_process')
const crypto = require("crypto")
const path = require('path')
const fs = require('fs')
const bodyParser = require('body-parser')

const downloadCounter = [

]

app.use(bodyParser.json(), cors(), bodyParser.urlencoded({ extended: true }))

app.get("/api", (req, res) => {
    res.send(`<style>h1 {text-align: center;}</style><h1>windingtheropes api version 1.0</h1>`)
})

function downloadVideo(options, callback) {
    const {url, id} = options
    var child = exec(`youtube-dl ${url} --output ${path.join(__dirname, 'videos', id)}`)
    // child.stdout.on('data', (data) => console.log(data))
    child.on('exit', () => {
        console.log('Download complete')
        const p = findFileById(id)
        callback(p)
    })
}

function convertToMp4(options, callback) {
    const {video, id} = options
    var child = exec(`ffmpeg -i ${video} ${path.join(__dirname, 'videos', id)}.mp4 `)
    child.stdout.on('data', (data) => console.log(data))
    child.on('exit', () => {
        console.log('Conversion complete')
        const p = findFileById(id, '.mp4')
        callback(p)
    })
}

function findFileById(id, ext) {
    const folder = fs.readdirSync(path.join(__dirname, 'videos'))

    for (const file of folder) {
        if(ext)
        {
            if(file.startsWith(id) && file.endsWith(ext)) return path.join(__dirname, 'videos', file)
        }
        else
        {
            if(file.startsWith(id)) return path.join(__dirname, 'videos', file)
        }
    }
}

function purgeId(id)
{
    const folder = fs.readdirSync(path.join(__dirname, 'videos'))

    for (const file of folder) {
        if(file.startsWith(id)) fs.unlinkSync(path.join(__dirname, 'videos', file))
    }
    return
}

app.get('/api/youtube-dl', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'))
})

app.get(`/api/youtube-dl/video`, (req, res) => {
    const id = req.query.id

    if(downloadCounter.find(d => id === id)) {downloadCounter.find(d => id === id).count++}
    else downloadCounter.push({id, count: 1})

    if(downloadCounter.find(d => id === id).count > 2) {purgeId(id); return res.status(404).send("Video deleted after 2 downloads.")}

    const path = findFileById(id)
    if(!path) return res.sendStatus(404)

    const mp4Exists = findFileById(id, '.mp4')
    if(!mp4Exists) convertToMp4({video: path, id}, (p) => {
        res.status(202).download(p)
    })
    else res.status(202).download(mp4Exists)
})

app.post("/api/youtube-dl/download", (req, res) => {
    const id = crypto.randomBytes(8).toString("hex")
    downloadVideo({url: req.body.url, id}, (p) => {
        const dlString = `http://localhost:${port}/api/youtube-dl/video?id=${id}`
        res.status(200).send({downloadLink: dlString})
    })
})

app.listen(port, () =>
    console.log(`Example app listening on port ${port}!`)
)