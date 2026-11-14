from app.config import Settings


def test_database_url_is_built_from_connection_settings():
    settings = Settings(
        database_user="anti_spiral",
        database_password="p@ss:/word",
        database_host="localhost",
        database_port=5432,
        database_name="anti_spiral",
    )

    assert settings.database_url == (
        "postgresql+psycopg://anti_spiral:p%40ss%3A%2Fword"
        "@localhost:5432/anti_spiral"
    )
