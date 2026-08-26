you need a local server [NOT A CLOUDLINK SERVER, AN ACTUAL LOCAL HTTP SERVER SERVING FROM THE ASSETS FOLDER]
for that you'll need ssl certificates, cors stuff, all that, but dw there are two ways

# five server method
install Visual Studio Code, and inside Visual Studio Code, install the Five Server Extension.
the extensions button is the little cube thingy on the left sidebar 

# npm live-server method
install Node.JS, and then open this repo in Visual Studio Code. open up the terminal and to first see if npm [node package manager] is installed, type in `npm --version`. if it outputs correctly, you good. then type in `npm i -g live-server` [installs the live server package globally, so you can use it outside the project]
now when its done downloading, type in, `live-server --cors --no-browser --port=8000` [starts the server, allowing cors. it won't open up your browser showing the directory its serving from and starts on port 8000]

now on tw/penguinmod, all you gotta do is just use a fetching ext and fetch from the url `http://localhost:8000/path/to/wtvr/your/trying/to/fetch`

yea
