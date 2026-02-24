from flask import Flask, jsonify, render_template


app = Flask(__name__)


@app.route("/")
def index():
	return render_template("index.html")


@app.route("/healthz")
def healthz():
	return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
	app.run(debug=True)
