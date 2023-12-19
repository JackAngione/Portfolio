import shutil
import os

#updates the production files to whatever is in latest git folder
git_dist_folder = "/home/jack/WebstormProjects/Portfolio/web_app/dist/"
live_website = "/var/www/portfolio"
shutil.copytree(git_dist_folder, live_website)
music_files = "/var/www/portfolio/musicFiles"
public_folder = "/var/www/portfolio/public"

#create public folder in portfolio folder
os.makedirs(public_folder)
shutil.move(music_files, public_folder)


