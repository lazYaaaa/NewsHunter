-- Удалить все статьи из таблицы articles
DELETE FROM articles;
SELECT * FROM users;

-- Функция фильтрации новостей по дате публикации
-- Возвращает все статьи, опубликованные после указанной даты
CREATE OR REPLACE FUNCTION filter_articles_by_date(published_after DATE)
RETURNS TABLE(id INT, title TEXT, content TEXT, published_at DATE) AS $$
BEGIN
    RETURN QUERY
    SELECT id, title, content, published_at
    FROM articles
    WHERE published_at > published_after;
END;
$$ LANGUAGE plpgsql;

-- Функция обновления заголовка и содержимого новости по ID
CREATE OR REPLACE FUNCTION update_article(article_id INT, new_title TEXT, new_content TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE articles
    SET title = new_title,
        content = new_content
    WHERE id = article_id;
END;
$$ LANGUAGE plpgsql;
