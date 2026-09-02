import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Explore from "./pages/Explore";
import MyDrinks from "./pages/MyDrinks";
import Favorites from "./pages/Favorites";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import CreateDrink from "./pages/CreateDrink";
import EditDrink from "./pages/EditDrink";
import DrinkDetails from "./pages/DrinkDetails";
import Inventory from "./pages/Inventory";
import Party from "./pages/Party";
import PartyRoom from "./pages/PartyRoom";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Login e registrazione stanno fuori dal layout con header/footer */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route element={<Layout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/explore" element={<Explore />} />
                    <Route path="/drink/:id" element={<DrinkDetails />} />

                    <Route element={<ProtectedRoute />}>
                        <Route path="/my-drinks" element={<MyDrinks />} />
                        <Route path="/favorites" element={<Favorites />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/profile/edit" element={<EditProfile />} />
                        <Route path="/create-drink" element={<CreateDrink />} />
                        <Route path="/edit-drink/:id" element={<EditDrink />} />
                        <Route path="/inventory" element={<Inventory />} />
                        <Route path="/party" element={<Party />} />
                        <Route path="/party/:code" element={<PartyRoom />} />
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default AppRoutes;
