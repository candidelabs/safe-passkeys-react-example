# Be sure to restart your server when you modify this file.

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # Your front-end origin—adjust if needed:
    origins 'http://localhost:5173'

    # Allow all resources under this origin:
    resource '*',
      headers: :any,
      methods: %i[get post put patch delete options head]
  end
end
