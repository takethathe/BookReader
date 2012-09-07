function book_source() {
    this.book = '';
    this.books = {};
    this.sites = {};
    this.config = {};
    this.search = {};
    this.showPage = false;
    this.setNav = function(nav) {
        $('#panel').html(nav);
        $('#footer').html(nav);
    };
    this.appendNav = function(nav) {
        $('#panel').append(nav);
        $('#footer').append(nav);
    };
    this.showBookPage = function(title) {
        var book_info = this.books[this.book];
        var site_info = this.sites[book_info['site']];
        var page_info = book_info['index'][title];
        this.setNav('<a href="javascript:book.showBookIndex();">目录</a><span> | </span>' +
                    '<a href="javascript:book.redumpBookPage(\'' + title + '\');">下载</a>');
        if (typeof page_info['id'] != 'undefined') {
            var id = page_info['id'];
            // Add navigator
            var pre = this.getTitleById(id-1, book_info);
            var next = this.getTitleById(id+1, book_info);
            if (pre.length > 0)
                this.appendNav('<span> | </span><a href="javascript:book.showBookPage(\'' +
                               pre + '\');">上一页</a>');
            if (next.length > 0)
                this.appendNav('<span> | </span><a href="javascript:book.showBookPage(\'' +
                               next + '\');">下一页</a>');
            this.showPage = true;
            $('html, body').animate({ scrollTop: 0 }, 0);
        }
        if (page_info['downloaded']) {
            var contents = this.fs.readFileSync(page_info['dumped']);
            $('#result').html(contents.toString());
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

    this.searchBook = function() {
        var text = $('#search_text').val();
        this.showPage = false;
        //console.log('Search Book '+text);
        $('#result').html('<h1 align="center">搜索结果</h1><hr>');
        var search_results = this.search;
        for (var site in this.sites) {
            this.sites[site].searchBook(text, function(book_info){
                search_results[book_info['name']] = book_info;
                $('#result').append('<dd><a href="javascript:book.addBookFromSearch(\'' +
                                    book_info['name']+ '\');">'+ 
                                    book_info['name'] + ' -- ' +
                                    book_info['site'] +'</a></dd>');
            });
        }
    };

    this.addBookFromSearch = function(title) {
        var book_info = this.search[title];
        this.addBook(book_info);
        this.showBookList();
    }

    this.getTitleById = function(id, book_info) {
        var ret = '';
        var index_info = book_info['index'];
        if (id <= 0)
            return ret;

        for (var title in index_info) {
            if (index_info[title]['id'] == id) {
                ret = title;
                break;
            }
        }
        return ret;
    };

    this.redumpBookPage = function(title) {
        var book_info = this.books[this.book];
        var site_info = this.sites[book_info['site']];
        var path_root = this.books_root + '/' + book_info['site'] + '/' + book_info['name'] + '/';
        var book_read = this;
        this.dumpBookPage(book_info, site_info, path_root, title, book_read);
    };

    this.dumpBookPage = function(book_info, site_info, path_root, title, book_read) {
        var url = require('url');
        var fs = book_read.fs;
        var page_file = path_root + title.replace(/ /g, '');
        var content = '<h1 align="center">' + title + '</h1><hr>';
        var path = path_root + 'images/';
        var page_info = book_info['index'][title];
        site_info.parsePage(page_info['url'], function (page){
            if (page.text) {
                content += '<div>' + page.text + '</div><br>';
            }
            for (var i in page['images']) {
                var src = page['images'][i];
                var file_name = url.parse(src).pathname.split('/').pop();
                if (!fs.existsSync(path)) {
                    fs.mkdirSync(path);
                }
                book_read.download(src, path, book_read);
                page['images'][i] = path + file_name;
                content += '<img src="' + path + file_name + '"><br>';
            }
            fs.writeFile(page_file, content, function(err){
                if (err) {
                    console.log(err.message);
                    throw err;
                }
                page_info.downloaded = true;
                page_info.dumped = page_file;
                book_read.flushBookIndex(book_info, path_root+'index.json');
                if (book_read.showPage) {
                    book_read.showBookPage(title);
                }
            });
        });
    };

    this.updateBookIndex = function(book, update_index){
        var book_info = this.books[book];
        var site_info = this.sites[book_info['site']];
        this.showPage = false;
        if (book_info) {
            var book_index = book_info['index'];
            var books_root = this.books_root;
            var fs = this.fs;
            var modified = false;
            var dumpBookPage_func = this.dumpBookPage;
            var download_func = this.download;
            var path_root = this.books_root + '/' + book_info['site'] + '/' + book_info['name'] + '/';
            var book_read = this;
            $.get(book_info.url, function(data){
                site_info.getItem(data, book_info, function(i, size, item){
                    if (!book_index.hasOwnProperty(item.title)) {
                        book_index[item.title] = {
                            'url': item.link,
                            'id': i
                        };
                        if (update_index) {
                            $('#result').append('<dd><a href="javascript:book.showBookPage(\''+item.title+'\');">'+
                                                item.title+'</a></dd>');
                        }
                        dumpBookPage_func(book_info, site_info, path_root, item.title, book_read);
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
        this.showPage = false;
        var book_info = this.books[this.book];
        var site_info = this.sites[book_info['site']];
        var book_index = book_info['index'];
        this.setNav('<a href="javascript:book.showBookList();">书柜</a><span> | </span>' +
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
        this.showPage = false;
        this.setNav('<a href="javascript:book.showConfigure();">配置</a><span> | </span>' +
                    '<input type="text" id="search_text" />' +
                    '<input type="button" onclick="book.searchBook()" value="搜索" />');
        // List all books
        $('#result').html('<h1 align="center">书籍列表</h1><hr>');
        for (var b in this.books) {
            $('#result').append('<dd><a href="javascript:book.chooseBook(\'' +
                                this.books[b].name + '\');">' +
                                this.books[b].name + '</a></dd>');
        }
    };

    this.showConfigure = function(){
        this.showPage = false;
        this.setNav('<a href="javascript:book.showBookList();">书柜</a>');
        $('#result').html('<h1 align="center">配置</h1><hr><h3>代理</h3><br>' +
                          '<lable for="proxy_host">主机:</lable><input type="text" id="proxy_host" />' +
                          '<lable for="proxy_port">端口:</lable><input type="text" id="proxy_port" />' +
                          '<hr><input type="button" onclick="book.saveConfigure()" value="保存" />');
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

    this.download = function(file_url, path, book_read) {
        var fs = book_read.fs, 
        url = require('url'),
        http = require("http"),
        https = require("https"),
        download_func = book_read.download;

        var http_or_https = http;
        if (/^https:\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/.test(url)) {
            http_or_https = https;
        }

        var file_name = url.parse(file_url).pathname.split('/').pop();
        var options;
        if (book_read.config['host']) {
            options = {
                host: book_read.config['host'],
                port: book_read.config['port'],
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

    this.flushBookIndex = function(book_info, index_path) {
        var book_index = book_info['index'];
        var book_index_content = JSON.stringify(book_index);
        var fs = require('fs');
        fs.writeFile(index_path, book_index_content, function(err){
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
});
