# Paperplane Studio

Paperplane Studio is a browser-based drawing digitizer. It runs as a static
website and does not require a build step or package installation.

## Start the app

1. Open a terminal in this project folder.
2. Start a local web server:

   ```sh
   python3 -m http.server 8080
   ```

   On Windows, use `py -m http.server 8080` if `python3` is not available.
3. Open <http://localhost:8080> in a modern browser.
4. To stop the server, press `Ctrl+C` in the terminal.

You can also open `index.html` directly, but use the local server for camera
access. The browser may ask permission before using your camera. You can always
choose an existing image instead.

## Use the app

Choose or drop a drawing image, select an Ink, Pencil, or Color finish, and
adjust the paper cleanup and line contrast. Use the download button to save the
result as a PNG, or choose **Display drawing** to show it full-screen.
