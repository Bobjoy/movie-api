const app = require('express')();
const request = require('superagent');
const cheerio = require('cheerio');

const url = 'http://vip.iqiyi.com';

/**
 * 获取电影列表
 *
 * @param {CheerioStatic} $
 * @param {CheerioStatic} wrapper
 * @param {object} group
 */
function parseMovies($, wrapper) {
    let list = [];
    wrapper.find('.site-piclist li').each((_, li) => {
        var link = $(li).find('a.site-piclist_pic_link')

        list.push({
            id: $(li).attr('tvid'),
            name: link.attr('title'),
            href: link.attr('href'),
            image: link.find('img').attr('src')
        })
    });
    return list;
}

/**
 * 抓取电影
 *
 * @param {string} url
 * @param {Function} callback
 * @param {Boolean} lazy
 */
function MovieSpider(url, callback, lazy) {
    request.get(url).end((err, res) => {
        if (!err) {
            let $ = cheerio.load(res.text);

            if (!lazy) {
                let groups = [],
                    group,
                    list = $('.site-main').find('qchunk');

                list.each((index, qchunk) => {
                    let wrapper = $(qchunk).find('.wrapper-cols'),
                        lazyUrl = wrapper.attr('data-block-url');

                    group = {
                        type: $(qchunk).attr('id').replace('block-', ''),
                        name: $(qchunk).attr('data-block-name'),
                        list: []
                    };

                    if (lazyUrl) {
                        MovieSpider(`${url}/loading/${lazyUrl}`, (err, list) => {
                            if (err) {
                                callback(err);
                            } else {
                                group.list = list;
                                groups.push(group);

                                if (index + 1 === list.length) {
                                    callback(null, groups);
                                }
                            }
                        }, true);
                    } else {
                        group.list = parseMovies($, wrapper);
                        groups.push(group);
                    }
                });
            } else {
                callback(null, parseMovies($, $('.wrapper-piclist')));
            }
        } else {
            console.log('Get data failed !');
            callback(err);
        }
    });
}

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.get('/movies', (req, res) => {

    var result = {
        code: 200,
        data: []
    };

    // request.get(url).then((_res) => {
    //     let groups = [];

    //     let dom = _res.text,
    //         $ = cheerio.load(dom);

    //     var group;
    //     $('.site-main').find('qchunk').each((_, qchunk) => {
    //         let wrapper = $(qchunk).find('.wrapper-cols'),
    //             lazyUrl = wrapper.attr('data-block-url');

    //         group = {
    //             type: $(qchunk).attr('id').replace('block-', ''),
    //             name: $(qchunk).attr('data-block-name'),
    //             list: []
    //         };

    //         // 抓取页面中电影列表
    //         if (!lazyUrl) {
    //             parseMovies($, wrapper, group);
    //         }
    //         // 抓取分屏加载列表
    //         else {
    //             group.url = `${url}/loading/${lazyUrl}`;
    //         }

    //         groups.push(group);
    //     });

    //     return groups;
    // }).then((groups) => {
    //     groups.forEach(group => {
    //         if (group.url) {
    //             request.get(group.url).end((_err, _res) => {
    //                 if (!_err) {
    //                     let $ = cheerio.load(_res.text);
    //                     parseMovies($, $('.wrapper-piclist'), group);
    //                 } else {
    //                     group.error = _err;
    //                     console.log('Get data error !');
    //                 }
    //             });
    //         }
    //     });
    //     result.data = groups;

    //     res.send(result);
    // }).catch(err => {
    //     console.log('Get data failed !');

    //     result.code = 500;
    //     result.error = _err;

    //     res.send(result);
    // });

    MovieSpider(url, (err, data) => {
        if (err) {
            result.code = 500;
            result.error = err;
        } else {
            result.data = data;
        }

        res.send(result);
    });
});

app.listen(3000, () => console.log('Server started at http://localhost:3000'));