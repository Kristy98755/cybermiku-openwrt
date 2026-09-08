// CyberMiku logout action
// Destroys the session server-side (root ubus, like stock LuCI) and
// redirects back to the cybermiku dashboard, which will render the login page.

function index() {
	entry({ 'admin', 'cybermiku', 'logout' },
		call('action_logout'),
		_('Logout'), 100).leaf = true;
}

function action_logout() {
	const url = dispatcher.build_url('admin', 'cybermiku');

	if (ctx.authsession) {
		ubus.call('session', 'destroy', { ubus_rpc_session: ctx.authsession });

		if (http.getenv('HTTPS') == 'on')
			http.header('Set-Cookie', 'sysauth_https=; expires=Thu, 01 Jan 1970 01:00:00 GMT; path=/cgi-bin/luci');
		else
			http.header('Set-Cookie', 'sysauth_http=; expires=Thu, 01 Jan 1970 01:00:00 GMT; path=/cgi-bin/luci');
	}

	http.redirect(url);
}