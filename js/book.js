function book_source() {
    this.book = '';
    this.books = {};
    this.sites = {};
    this.proxy = {
        host: '127.0.0.1',
        port: 8080
    };
    this.show = function(url, title) {
        $('#panel').html('<a href="javascript:book.showBookPage();">目录</a>');
        $.get(url, function(data){
            var data_ = $(data);
            var text = $('#content', data_).text();
            $('#result').html('<h1 align="center">' +
                              title + '</h1><hr>');
            $('#result').append(text + '<br>');
            $('div.divimage img', data_).each(function(i, item){
                var src = $(item).attr('src');
                $('#result').append('<img src="'+src+'">');
            });
        });
    };

    this.showBookPage = function(){
        var book_info = this.books[this.book];
        var site_info = this.sites[book_info['site']];
        $('#panel').html('<a href="javascript:book.showBookList();">书柜</a>');
        if (book_info) {
            var addItem_cb = this.addItem;
            $('#result').html('<h1 align="center">' +
                              book_info.name + '</h1><hr>');
            $.get(book_info.url, function(data){
                site_info.getItem(data, book_info, addItem_cb);
            });
        } else {
            alert('Can not find '+this.book);
        }
    };

    this.addItem = function(item) {
        $('#result').append('<dd><a href="javascript:book.show(\''+
                            item.link+'\',\''+item.title+'\');">'+
                            item.title+'</a></dd>');
    };

    this.showBookList = function(){
        //TODO: Add configure page here
        $('#panel').html('');
        // List all books
        $('#result').html('<h1 align="center">书籍列表</h1><hr>');
        for (var b in this.books) {
            $('#result').append('<dd><a href="javascript:book.chooseBook(\'' +
                                this.books[b].name + '\');">' +
                                this.books[b].name + '</a></dd>');
        }
    };

    this.init = function() {
        this.fs = require('fs');
        var home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
        this.books_json = home+'/Documents/books/books.json';
        this.books_root = home+'/Documents/books';
        this.sites_root = 'site';
        if (!this.fs.existsSync(this.books_json)) {
            if (!this.fs.existsSync(this.books_root)) {
                this.fs.mkdirSync(this.books_root);
            }
            this.fs.writeFileSync(this.books_json, '{}');
        }
        var json = this.fs.readFileSync(this.books_json);
        this.books = eval('('+json+')');
        
        var files = this.fs.readdirSync(this.sites_root);
        for (var i in files) {
            var file = this.fs.readFileSync(this.sites_root + '/' + files[i]);
            var site = eval('('+file+')');
            this.sites[site['name']] = site;
        }
        this.showBookList();
    };

    this.download = function(file_url, path) {
        var fs = this.fs, 
        url = require('url'),
        http = require("http"),
        https = require("https"),
        download_func = this.download;

        var http_or_https = http;
        if (/^https:\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/.test(url)) {
            http_or_https = https;
        }

        var file_name = url.parse(file_url).pathname.split('/').pop();
        var options;
        if (this.proxy['host']) {
            options = {
                host: this.proxy['host'],
                port: this.proxy['port'],
                path: file_url
            };
        } else {
            options = {
                host: url.parse(file_url).host,
                port: 80,
                path: url.parse(file_url).pathname
            };
        }

        http_or_https.get(options, function(response) {
            switch(response.statusCode) {
            case 200:
                var file = fs.createWriteStream(path + file_name);
                response.on('data', function(chunk){
                    file.write(chunk);
                }).on('end', function(){
                    file.end();
                    console.log(file_name + ' downloaded to ' + path);
                });
                break;
            case 301:
            case 302:
            case 303:
            case 307:
                download_func(response.headers.location, path);
                break;
            default:
                console.log('Server responded with status code ' + response.statusCode);
            }
        }).on('error', function(err){
            console.log(err.message);
        });
    };

    this.addBook = function(book_info) {
        this.books[book_info['name']] = book_info;
        this.flushBookList();
    };

    this.chooseBook = function(name) {
        this.book = name;
        this.showBookPage();
    };

    this.flushBookList = function() {
        var book_json = JSON.stringify(this.books);
        if (!this.fs.existsSync(this.books_root)) {
            this.fs.mkdirSync(this.books_root);
        }
        this.fs.writeFile(this.books_json, book_json, function(err){
            if (err) {
                console.log(err.message);
                throw err;
            }
        });
    };
}

$(document).ready(function(){
    window.book = new book_source();
    window.book.init();
    window.book.addBook({
        'name': 'zwwx',
        'id': '3730',
        'site': 'zwwx',
        'url': 'http://www.zwwx.com/book/3/3730/index.html'
    });
    //window.book.chooseBook('zwwx');
});
