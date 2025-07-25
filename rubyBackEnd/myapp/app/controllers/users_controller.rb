# app/controllers/users_controller.rb
class UsersController < ApplicationController
  # JSON API—disable CSRF checks
  protect_from_forgery with: :null_session

  # Rescue any uniqueness-constraint violations (duplicate username or account_address)
  rescue_from ActiveRecord::RecordNotUnique do
    render json: { error: "Username already exists. Please write new one." }, status: :conflict
  end

  # GET /users
  def index
    render json: User.all
  end

  # GET /users/by_account/:account_address
  def by_account
    user = User.find_by(account_address: params[:account_address])
    return render json: user if user

    render_not_found
  end

  # GET /users/by_username/:username
  def login
    user = User.find_by(username: params[:username])
    return render json: user if user

    render_not_found
  end

  # POST /users
  def create
    user = User.new(user_params)

    if user.save
      render json: user, status: :created
    else
      # Validation errors (except uniqueness which is caught above)
      render json: { errors: user.errors.full_messages },
             status: :unprocessable_entity
    end
  end

  private

  def user_params
    # expects payload:
    # { user: {
    #     account_address: "0x123…",
    #     username:        "Alice",
    #     pubkey_id:       "...",
    #     pubkey_coordinates: { x: "0x…", y: "0x…" }
    #   }
    # }
    params.require(:user)
          .permit(
            :account_address,
            :username,
            :pubkey_id,
            pubkey_coordinates: [:x, :y]
          )
  end

  def render_not_found
    render json: { error: "User not found" }, status: :not_found
  end
end
