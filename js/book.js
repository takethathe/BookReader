function book_source() {
    this.book = '';
    this.books = {};
    this.sites = {};
    this.show = function(url, title) {
        this.download_page(url, function(data){
            var data_ = $(data);
            var text = $('#content', data_).text();
            $('#result').html(title+'<br>');
            $('#result').html(text+'<br>');
            $('div.divimage img', data_).each(function(i, item){
                var src = $(item).attr('src');
                $('#result').append('<img src="'+src+'">');
            });
        });
    };

    this.run = function(){
        var book_info = this.books[this.book];
        var site_info = this.sites[book_info['site']];
        if (book_info) {
            var addItem_cb = this.addItem;
            this.download_page(book_info.url, function(data){
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
    };

    this.download = function(from, to) {
        var fs = this.fs; 
        http = require("http"),
        url = require("url");
        
        var url_parse = url.parse(from);
        var host = url_parse.hostname
        var path = url_parse.pathname;

        var req = http.request(
            {host: host,
             port: 80,
             path: path,
             method: 'GET'
            }, function(res){
                console.log('Start Download File: '+from);
                var downloadfile = fs.createWriteStream(to, {'flags': 'a'});
                res.on('data', function (chunk) {
                    downloadfile.write(chunk, encoding='binary');
                });
                res.on("end", function() {
                    downloadfile.end();
                });
            });
        req.on('error', function(e){
            console.log('Error: ' + e.message);
        });
        req.end();

    }

    this.addBook = function(book_info) {
        this.books[book_info['name']] = book_info;
        this.flushBookList();
    };

    this.chooseBook = function(name) {
        this.book = name;
    };

    this.flushBookList = function() {
        var book_json = JSON.stringify(this.books);
        if (!this.fs.existsSync(this.books_root)) {
            this.fs.mkdirSync(this.books_root);
        }
        this.fs.writeFile(this.books_json, book_json, function(err){
            if (err) {
                alert(err);
                throw err;
            }
        });
    };
}

book_source.prototype.download_page = function(url, success) {
    $.get(url, function(data){
        success(data);
    });
};

$(document).ready(function(){
    window.book = new book_source();
    window.book.init();
    window.book.addBook({
        'name': 'zwwx',
        'css': 'zwwx.css',
        'js': 'zwwx.js',
        'id': '3730',
        'site': 'zwwx',
        'url': 'http://www.zwwx.com/book/3/3730/index.html'
    });
    window.book.chooseBook('zwwx');
    window.book.run();
    window.book.download('http://www.hacksparrow.com/wp-content/themes/hacksparrow/images/logo.png', window.book.books_root+'/aaa.png');
});
