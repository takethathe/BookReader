function book_source() {
    this.book = '';
    this.books = {};
    this.sites = {};
    this.config = {};
    this.showBookPage = function(title) {
        var book_info = this.books[this.book];
        var site_info = this.sites[book_info['site']];
        var page_info = book_info['index'][title];
        $('#panel').html('<a href="javascript:book.showBookIndex();">目录</a>');
        if (page_info['downloaded']) {
            var contents = this.fs.readFileSync(this.books_root + '/' + book_info['site'] + '/' +
                                                book_info['name'] + '/' + title);
            $('#result').html(contents);
        } else {
            site_info.parsePage(page_info['url'], function (page) {
                $('#result').html('<h1 align="center">' +
                                  title + '</h1><hr>');
                $('#result').append(page.text + '<br>');
                for (var i in page['images']) {
                    var src = page['images'][i];
                    $('#result').append('<img src="'+src+'">');
                }
            });
        }
    };

    this.dumpBookPage = function(book_info, title) {
        var url = require('url');
        var page_info = book_info['index'][title];
        var site_info = this.sites[book_info['site']];
        var page_file = this.books_root + '/' + book_info['site'] + '/' +
            book_info['name'] + '/' + title;
        var content = '<h1 align="center">' + title + '</h1><hr>';
        var download_func = this.download;
        var fs = this.fs;
        var path = this.books_root + '/' + book_info['site'] + '/' +
            book_info['name'] + '/images/';
        site_info.parsePage(page_info['url'], function (page){
            if (page.text) {
                content += page.text + '<br>';
            }
            for (var i in page['images']) {
                var src = page['images'][i];
                var file_name = url.parse(src).pathname.split('/').pop();
                if (!fs.existsSync(path)) {
                    fs.mkdirSync(path);
                }
                download_func(src, path);
                page['images'][i] = path + file_name;
            }
        });
    };

    this.updateBookIndex = function(book, update_index){
        var book_info = this.books[book];
        var site_info = this.sites[book_info['site']];
        if (book_info) {
            var book_index = book_info['index'];
            var books_root = this.books_root;
            var fs = this.fs;
            var modified = false;
            var dumpBookPage_func = this.dumpBookPage;
            $.get(book_info.url, function(data){
                site_info.getItem(data, book_info, function(i, size, item){
                    if (!book_index.hasOwnProperty(item.title)) {
                        book_index[item.title] = {
                            'url': item.link
                        };
                        if (update_index) {
                            $('#result').append('<dd><a href="javascript:book.showBookPage(\''+item.title+'\');">'+
                                                item.title+'</a></dd>');
                        }
                        dumpBookPage_func(book_info, item.title);
                        modified = true;
                    }
                    if (i == size-1 && modified) {
                        var book_index_file = books_root + '/' + 
                            book_info['site'] + '/' + book_info['name'] + '/index.json';
                        var book_index_content = JSON.stringify(book_index);
                        fs.writeFileSync(book_index_file, book_index_content);
                    }
                });
            });
        }
    };

    this.updateAllBook = function(){
        for (var book in this.books) {
            this.updateBookIndex(book, false);
        }
    };

    this.showBookIndex = function(){
        var book_info = this.books[this.book];
        var site_info = this.sites[book_info['site']];
        var book_index = book_info['index'];
        $('#panel').html('<a href="javascript:book.showBookList();">书柜</a>|' +
                        '<a href="javascript:book.updateBookIndex(\'' +
                         this.book + '\', true);">更新</a>');
        if (book_info) {
            $('#result').html('<h1 align="center">' +
                              book_info.name + '</h1><hr>');
            for (var title in book_index) {
                $('#result').append('<dd><a href="javascript:book.showBookPage(\'' +
                                    title + '\');">' + title + '</a></dd>');
            }
        } else {
            alert('Can not find '+this.book);
        }
    };

    this.showBookList = function(){
        $('#panel').html('<a href="javascript:book.showConfigure();">配置</a>');
        // List all books
        $('#result').html('<h1 align="center">书籍列表</h1><hr>');
        for (var b in this.books) {
            $('#result').append('<dd><a href="javascript:book.chooseBook(\'' +
                                this.books[b].name + '\');">' +
                                this.books[b].name + '</a></dd>');
        }
    };

    this.showConfigure = function(){
        $('#panel').html('<a href="javascript:book.showBookList();">书柜</a>');
        $('#result').html('<h1 align="center">配置</h1><hr><h3>代理</h3><br>' +
                          '<lable for="proxy_host">主机:</lable><input type="text" id="proxy_host" />' +
                          '<lable for="proxy_port">端口:</lable><input type="text" id="proxy_port" />' +
                          '<hr><input type="button" onclick="book.saveConfigure()" value="保存"></button>');
        $('#proxy_host').val(this.config['host'] || '');
        $('#proxy_port').val(this.config['port'] || '');
    };

    this.saveConfigure = function(){
        var host = $('#proxy_host').val();
        var port = $('#proxy_port').val().replace(/[^\d]+/g, '');
        port = parseInt(port, 10);
        this.config['host'] = host;
        this.config['port'] = port;

        this.fs.writeFile(this.config_json, JSON.stringify(this.config), function(err) {
            if (err) {
                console.log(err.message);
                throw err;
            }
        });
        this.showBookList();
    };

    this.init = function() {
        this.fs = require('fs');
        var home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
        this.books_json = home+'/Documents/books/books.json';
        this.books_root = home+'/Documents/books';
        this.sites_root = 'site';
        this.config_json = this.books_root + '/config.json';
        if (!this.fs.existsSync(this.books_json)) {
            if (!this.fs.existsSync(this.books_root)) {
                this.fs.mkdirSync(this.books_root);
            }
            this.fs.writeFileSync(this.books_json, '{}');
        }

        var json = this.fs.readFileSync(this.books_json);
        this.books = eval('('+json+')');

        if (!this.fs.existsSync(this.config_json)) {
            this.fs.writeFileSync(this.config_json, '{}');
        }
        json = this.fs.readFileSync(this.config_json);
        this.config = eval('('+json+')');
        
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
        if (this.config['host']) {
            options = {
                host: this.config['host'],
                port: this.config['port'],
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
        var book_site_dir = this.books_root + '/' + book_info['site'];
        if (!this.fs.existsSync(book_site_dir)) {
            this.fs.mkdirSync(book_site_dir);
        }
        var book_dir = book_site_dir + '/' + book_info['name'];
        if (!this.fs.existsSync(book_dir)) {
            this.fs.mkdirSync(book_dir);
        }
        this.flushBookList();
    };

    this.chooseBook = function(name) {
        var book_info;
        var book_index_file;
        var book_index;
        if (this.book != name) {
            if (this.book != '') {
                book_info = this.books[this.book];
                book_index_file = this.books_root + '/' + 
                    book_info['site'] + '/' + book_info['name'] + '/index.json';
                book_index = book_info['index'];
                var book_index_content = JSON.stringify(book_index);
                this.fs.writeFileSync(book_index_file, book_index_content);
            }

            this.book = name;

            book_info = this.books[this.book];
            book_index_file = this.books_root + '/' + 
                book_info['site'] + '/' + book_info['name'] + '/index.json';
            book_index = {};
            if (this.fs.existsSync(book_index_file)) {
                var json = this.fs.readFileSync(book_index_file);
                book_index = eval('(' + json + ')');
            }
            book_info['index'] = book_index;
        }
        this.showBookIndex();
    };

    this.flushBookList = function() {
        var books = {};
        for (var book in this.books) {
            books[book] = {};
            for (var p in this.books[book]) {
                if (p != 'index') {
                    books[book][p] = this.books[book][p];
                }
            }
        }
        var book_json = JSON.stringify(books);
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
});
