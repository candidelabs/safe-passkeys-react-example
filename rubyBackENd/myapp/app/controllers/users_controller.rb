# app/controllers/users_controller.rb
class UsersController < ApplicationController
  # JSON API—disable CSRF checks
  protect_from_forgery with: :null_session

  # GET /users/by_account/:account_address
  def by_account
    user = User.find_by(username: params[:account_address])
    if user
      render json: user
    else
      render json: { error: "User not found" }, status: :not_found
    end
  end

  # POST /users
  def create
    raw = params.require(:user).to_unsafe_h

    user = User.new(
      username:           raw['account_address'],
      pubkey_id:          raw['pubkey_id'],
      pubkey_coordinates: raw['pubkey_coordinates']
    )

    if user.save
      render json: user, status: :created
    else
      render json: { errors: user.errors.full_messages },
             status: :unprocessable_entity
    end
  end

  # GET /users
  def index
    render json: User.all
  end
end
