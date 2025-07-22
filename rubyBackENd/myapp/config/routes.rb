Rails.application.routes.draw do
  # GET /users/by_account/:account_address
  get 'users/by_account/:account_address', to: 'users#by_account'

  resources :users, only: [:create, :index]
end
