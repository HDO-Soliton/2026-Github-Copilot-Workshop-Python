import pathlib
import sys
import unittest


class FlaskAppTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app_dir = pathlib.Path(__file__).resolve().parents[2]
        sys.path.insert(0, str(app_dir))
        import app as module

        cls.app = module.app
        cls.app.testing = True

    def test_index_returns_200(self):
        client = self.app.test_client()
        response = client.get("/")
        self.assertEqual(response.status_code, 200)

    def test_healthz_returns_ok(self):
        client = self.app.test_client()
        response = client.get("/healthz")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"status": "ok"})


if __name__ == "__main__":
    unittest.main()
