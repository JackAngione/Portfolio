# update server info
server_info_path = "/home/jack/Documents/GITHUB REPOS/Portfolio/web_app/src/routes/serverInfo.jsx"

with open(server_info_path, 'w') as file:
    file.write(
        """//dev
// export const serverAddress = "http://localhost:3000"
// export const searchServer = 'http://192.168.1.159:7701'

//production
export const serverAddress = "https://jackangione.com/api"
export const searchServer = 'https://jackangione.com/search'""""
    )
