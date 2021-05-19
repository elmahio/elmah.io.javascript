declare class Elmahio {
    constructor(options: Elmahio.Options);

    /**
     * Subscribe to the 'message' event to get a callback every time a message is logged to elmah.io.
     * @param type Must be 'message'
     * @param handler The handler to invoke, before a new message is logged
     */
    on(type: "message", handler: (msg: Elmahio.Message) => void): this;
    /**
     * Subscribe to the 'error' event to get a callback when logging a message to elmah.io failed.
     * @param type Must be 'error'
     * @param handler The handler to invoke, after the logging failed.
     */
    on(type: "error", handler: (status: number, statusText: string) => void): this;

    /**
     * Logs a verbose message to elmah.io.
     * @param title The title/headling for the message.
     * @param error An optional JavaScript Error object.
     */
    verbose(title: string, error?: Error): void;
    /**
     * Logs a debug message to elmah.io.
     * @param title The title/headling for the message.
     * @param error An optional JavaScript Error object.
     */
    debug(title: string, error?: Error): void;
    /**
     * Logs an information message to elmah.io.
     * @param title The title/headling for the message.
     * @param error An optional JavaScript Error object.
     */
    information(title: string, error?: Error): void;
    /**
     * Logs a warning message to elmah.io.
     * @param title The title/headling for the message.
     * @param error An optional JavaScript Error object.
     */
    warning(title: string, error?: Error): void;
    /**
     * Logs an error message to elmah.io.
     * @param title The title/headling for the message.
     * @param error An optional JavaScript Error object.
     */
    error(title: string, error?: Error): void;
    /**
     * Logs a fatal message to elmah.io.
     * @param title The title/headling for the message.
     * @param error An optional JavaScript Error object.
     */
    fatal(title: string, error?: Error): void;
    /**
     * Logs a message to elmah.io. With this function, you have full control of all the information you want logged.
     * @param message The Message object to log.
     */
    log(message: Elmahio.Message): void;
    /**
     * Create a new message with prefilled values for url, server variables, etc. Set a title and any other values you want to log and send the message as parameter to the log-function.
     */
    message(error?: Error): Elmahio.Message;
}

declare namespace Elmahio {
    interface Options {
        /**
         * Your API key found on the organization settings view. Make sure to use an API key with only the messages_write permission added.
         */
        apiKey: string;
        /**
         * The id of the log to send messages to.
         */
        logId: string;
        /**
         * If set, the value will be used as the application name on all messages logged to elmah.io.
         */
        application?: string;
        /**
         * If set to true, elmah.io.javascript will write a range of debug messages to the console.
         */
        debug?: boolean;
        /**
         * Implement the 'filter' function to be able to ignore messages before they are logged to elmah.io.
         */
        filter?(message: Elmahio.Message): boolean;
        /**
         * Log console.debug, console.info, console.warn, and console.error to elmah.io.
         * Can have one of the following values: 'none', 'debug', 'info', 'warn', 'error'. Default is 'none'.
         */
        captureConsoleMinimumLevel?: string;
		/**
		 * Log breadcrumbs
		 */
		breadcrumbs: boolean;
    }

    interface Item {
        key: string;
        value: string;
    }

    interface Message {
        /**
         * Used to identify which application logged this message. You can use this if you have multiple applications and services logging to the same log.
         */
        application: string;
        /**
         * A longer description of the message. For errors this could be a stacktrace, but it's really up to you what to log in there.
         */
        detail: string;
        /**
         * The hostname of the server logging the message.
         */
        hostname: string;
        /**
         * The textual title or headline of the message to log.
         */
        title: string;
        /**
         * The title template of the message to log. This property can be used from logging frameworks that supports structured logging like: "{user} says {quote}". In the example, titleTemplate will be this string and title will be "Gilfoyle says It's not magic. It's talent and sweat".
         */
        titleTemplate: string;
        /**
         * The source of the code logging the message. This could be the assembly name.
         */
        source: string;
        /**
         * If the message logged relates to a HTTP status code, you can put the code in this property. This would probably only be relevant for errors, but could be used for logging successful status codes as well.
         */
        statusCode: number;
        /**
         * The date and time in UTC of the message. If you don't provide us with a value in dateTime, we will set the current date and time in UTC.
         */
        dateTime: Date;
        /**
         * The type of message. If logging an error, the type of the exception would go into type but you can put anything in there, that makes sense for your domain.
         */
        type: string;
        /**
         * An identification of the user triggering this message. You can put the users email address or your user key into this property.
         */
        user: string;
        /**
         * An enum value representing the severity of this message. The following values are allowed: Verbose, Debug, Information, Warning, Error, Fatal
         */
        severity: string;
        /**
         * If message relates to a HTTP request, you may send the URL of that request. If you don't provide us with an URL, we will try to find a key named URL in serverVariables.
         */
        url: string;
        /**
         * If message relates to a HTTP request, you may send the HTTP method of that request. If you don't provide us with a method, we will try to find a key named REQUEST_METHOD in serverVariables.
         */
        method: string;
        /**
         * Versions can be used to distinguish messages from different versions of your software. The value of version can be a SemVer compliant string or any other syntax that you are using as your version numbering scheme.
         */
        version: string;
        /**
         * CorrelationId can be used to group similar log messages together into a single discoverable batch. A correlation ID could be a session ID from ASP.NET Core, a unique string spanning multiple microsservices handling the same request, or similar.
         */
        correlationId: string;
        /**
         * A key/value pair of cookies. This property only makes sense for logging messages related to web requests.
         */
        cookies: Array<Item>;
        /**
         * A key/value pair of form fields and their values. This property makes sense if logging message related to users inputting data in a form.
         */
        form: Array<Item>;
        /**
         * A key/value pair of query string parameters. This property makes sense if logging message related to a HTTP request.
         */
        queryString: Array<Item>;
        /**
         * A key/value pair of server values. Server variables are typically related to handling requests in a webserver but could be used for other types of information as well.
         */
        serverVariables: Array<Item>;
        /**
         * A key/value pair of user-defined fields and their values. When logging an exception, the Data dictionary of the exception is copied to this property. You can add additional key/value pairs, by modifying the Data dictionary on the exception or by supplying additional key/values to this API.
         */
        data: Array<Item>;
		/**
		 * A key/value pair of user events.
		 */
		breadcrumbs: Array<Item>;
    }
}

export = Elmahio;

export as namespace Elmahio;
