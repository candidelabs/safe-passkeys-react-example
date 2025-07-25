Rails.application.routes.draw do
  resources :users, only: [:index, :create] do
    collection do
      # lookup by on‐chain address
      get  'by_account/:account_address', to: 'users#by_account'
      # new: lookup by display name
      get  'by_username/:username',      to: 'users#login'
    end
  end
end
