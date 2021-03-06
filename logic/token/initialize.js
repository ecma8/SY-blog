
var storageSignToken = require( './storageSignToken' ),             // sign, token存储
    jwt = require( "jsonwebtoken" ),
    oToken = {};

// token秘钥
oToken.secretOrPrivateKey = "shiyue.pw";

/**
 * @method validate
 * @description token验证, 验证类型跟签名类型一致, 适配更多验证模式
 */
oToken.validate = {
    client: function( req, token ) {
        var clientIp = req.headers[ 'x-forwarded-for' ] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress,
            ip = clientIp.slice( 7 ),
            userAgent = req.headers[ 'user-agent'],
            isPass = false;

        token = token || {};

        if ( !token.ip || !token.userAgent ) return isPass;
        if ( token.ip !== ip ) return isPass;
        if ( token.userAgent !== userAgent ) return isPass;

        isPass = true;
        return isPass;
    }
};

/**
 * @method check
 * @description 根据signToken( 签名 )来检测token是否有效, 是否过期, 如果过期则重新登录, 此方法挂在中间件上
 */
oToken.check = function( req, res, next ) {
    var signToken = req.body.token || req.query.token || req.cookies.token || req.headers[ "x-access-token" ],
        token = storageSignToken.query( signToken );

    if ( !token || !signToken ) return res.json( returnFactory( -1008, "token无效" ) );

    // 验证token, 传输私钥
    jwt.verify( token, oToken.secretOrPrivateKey, function( err, decode ) {
        var isPass;
        if ( err ) {

            // 如果token过期或者无效, 则去删除缓存中的引用
            storageSignToken.delete( signToken );
            return res.json( returnFactory( -1005, "登录超时" ) );
        }

        // 验证token是否伪造
        isPass = oToken.validate[ decode.type ]( req, decode );
        if ( !isPass ) {
            return res.json( returnFactory( -1006, "未登录" ) );
        }

        req.user = decode;
        next();
    });
};

/**
 * @method create
 * @description 创建token
 *
 * @param {Object} options token的内容标示
 * @param {Function} cbHandle 创建token成功的回调
 */
oToken.create = function( options, cbHandle ) {
    options = options || {};
    var token = jwt.sign( options, oToken.secretOrPrivateKey, {
        expiresIn: 60 * 60  // 秒计算
    });

    cbHandle( token );
};

/**
 * @method decodeJWT
 * @description 根据签名解出token内容
 *
 * @param {String} sign 签名后的token
 * @param {Function} cbHandle 回调
 * @return {*} payload信息
 */
oToken.decodeJWT = function( sign, cbHandle ) {
    var result = null,
        token = storageSignToken.query( sign );

    if ( !token ) return result;
    jwt.verify( token, oToken.secretOrPrivateKey, function( err, decode ) {
        if ( err ) return result;
        cbHandle( decode );
    });
};

module.exports = oToken;